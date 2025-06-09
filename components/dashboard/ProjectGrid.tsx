'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Lightbox from './Lightbox';

type ProjectMetadata = {
  status: 'show' | 'hide' | 'feature';
  title?: string;
  description?: string;
  lastModified: string;
};

type FileItem = {
  name: string;
  type: 'file' | 'directory';
  path: string;
  show?: boolean;
};

type Props = {
  initialPath: string;
  projects: FileItem[];
};

export default function ProjectGrid({ initialPath, projects }: Props) {
  const pathname = usePathname();
  const [currentProject, setCurrentProject] = useState<FileItem | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [projectStates, setProjectStates] = useState<Record<string, ProjectMetadata>>({});
  const [contentMap, setContentMap] = useState<any>(null);
  const [images, setImages] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showAll, setShowAll] = useState(true);

  // Load all project states on mount
  useEffect(() => {
    // Commenting out loadAllProjectStates as metadata is temporarily ignored
    // const loadAllProjectStates = async () => {
    //   const states: Record<string, ProjectMetadata> = {};
    //   for (const project of projects) {
    //     try {
    //       const response = await fetch(`/api/project-state?path=${encodeURIComponent(project.path)}`);
    //       if (response.ok) {
    //         const data = await response.json();
    //         states[project.path] = data.metadata;
    //       } else {
    //         console.error(`Error loading state for project ${project.path}:`, response.statusText);
    //       }
    //     } catch (error) {
    //       console.error(`Error loading state for project ${project.path}:`, error);
    //     }
    //   }
    //   setProjectStates(states);
    // };

    // if (projects && projects.length > 0) {
    //   loadAllProjectStates();
    // }
  }, [projects]);

  useEffect(() => {
    // Load content map on component mount
    const loadContentMap = async () => {
      try {
        const response = await fetch('/api/content-map');
        const data = await response.json();
        setContentMap(data);
      } catch (error) {
        console.error('Error loading content map:', error);
      }
    };
    loadContentMap();
  }, []);

  const findMediaInDirectory = async (dirPath: string): Promise<{ media: FileItem[], metadata: ProjectMetadata | null }> => {
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
      if (!response.ok) {
        console.error(`Error fetching files from ${dirPath}:`, response.statusText);
        return { media: [], metadata: null };
      }
      const data = await response.json();
      
      let fetchedMedia: FileItem[] = [];
      if (data.items) {
        // The API now returns all files recursively, including type and relative name
        // We just need to filter for media types we want to display and map them
        fetchedMedia = data.items
          .filter((item: FileItem) => 
            item.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name)
          )
          .map((item: FileItem) => ({
            ...item,
            // Temporarily hardcode show to true for all media
            show: true
          }));
      }

      // Metadata is simplified from the API response
      return { media: fetchedMedia, metadata: data.projectState || null };

    } catch (error) {
      console.error(`Error in findMediaInDirectory for ${dirPath}:`, error);
      return { media: [], metadata: null };
    }
  };

  const loadProjectMedia = async (project: FileItem) => {
    setIsLoading(true);
    setImages([]); // Clear previous images
    setProjectMetadata(null); // Clear previous metadata
    try {
      const { media: projectMedia, metadata } = await findMediaInDirectory(project.path);
      setImages(projectMedia);
      if (metadata) {
        setProjectMetadata(metadata);
        // Commenting out projectStates update as metadata is temporarily ignored
        // setProjectStates(prev => ({
        //   ...prev,
        //   [project.path]: metadata
        // }));
      } else {
        // If metadata is null, use a default
        const defaultMetadata: ProjectMetadata = {
          status: 'show',
          lastModified: new Date().toISOString(),
          title: formatProjectName(project.name)
        };
        setProjectMetadata(defaultMetadata);
        console.warn(`Metadata not found for project ${project.path} after loading media.`);
      }
    } catch (error) {
      console.error('Error loading project media:', error);
    }
    setIsLoading(false);
  };

  const handleProjectClick = async (project: FileItem) => {
    setCurrentProject(project);
    await loadProjectMedia(project);
  };

  const toggleProjectVisibility = async (project: FileItem) => {
    if (!contentMap) return;
    
    try {
      const newVisibility = !contentMap.projects[project.name]?.visible;
      console.log(`Project "${project.name}" visibility set to ${newVisibility}`);

      const response = await fetch('/api/content-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: project.name,
          visible: newVisibility
        }),
      });

      if (response.ok) {
        const updatedMap = await response.json();
        console.log(`Project "${project.name}" visibility updated successfully`);
        setContentMap(updatedMap);
      } else {
        console.error(`Failed to update project "${project.name}" visibility:`, await response.text());
      }
    } catch (error) {
      console.error(`Error toggling project "${project.name}" visibility:`, error);
    }
  };

  const toggleImageVisibility = async (image: FileItem) => {
    if (!currentProject || !contentMap) return;
    
    try {
      // If the item doesn't have a visibility state yet, treat it as visible (true)
      const currentVisibility = contentMap.projects[currentProject.name]?.items[image.path]?.visible ?? true;
      const newVisibility = !currentVisibility;
      console.log(`Item "${image.name}" in project "${currentProject.name}" visibility set to ${newVisibility}`);

      const response = await fetch('/api/content-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: currentProject.name,
          itemPath: image.path,
          visible: newVisibility
        }),
      });

      if (response.ok) {
        const updatedMap = await response.json();
        console.log(`Item "${image.name}" visibility updated successfully`);
        setContentMap(updatedMap);
      } else {
        console.error(`Failed to update item "${image.name}" visibility:`, await response.text());
      }
    } catch (error) {
      console.error(`Error toggling item "${image.name}" visibility:`, error);
    }
  };

  // Format project name for display (remove any common prefixes, convert to title case)
  const formatProjectName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      <div className="flex min-h-screen bg-[#f8f8f8]">
        {/* Left Sidebar */}
        <div className="w-[240px] bg-white p-8 flex flex-col h-screen overflow-y-auto">
          <Link href="/" className="mb-12 flex items-center gap-2">
            <Image src="/gretel-logo.svg" alt="Gretel Logo" width={23} height={27} />
            <span className="text-base font-medium">WIP</span>
          </Link>
          
          <div className="text-sm text-gray-400 mb-4">PROJECTS</div>
          <div className="space-y-3">
            {projects
              .map(project => {
                const isSelected = currentProject?.path === project.path;
                const isVisible = contentMap?.projects[project.name]?.visible ?? true;
                
                return {
                  project,
                  isSelected,
                  isVisible,
                  sortOrder: isVisible ? 1 : 2
                };
              })
              .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                  return a.sortOrder - b.sortOrder;
                }
                return formatProjectName(a.project.name).localeCompare(formatProjectName(b.project.name));
              })
              .map(({ project, isSelected, isVisible }) => (
                <div key={project.path} className={`flex items-center gap-2 ${!isVisible ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => toggleProjectVisibility(project)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {isVisible ? (
                      <EyeIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleProjectClick(project)}
                    className={`flex-1 text-left text-base transition-colors ${
                      isSelected
                        ? 'text-black font-medium'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {formatProjectName(project.name)}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-12 relative">
          {/* Floating Navigation */}
          <div className="absolute top-8 right-12 flex gap-3">
            <Link 
              href="/content"
              className={`px-4 py-2 text-sm transition-colors ${
                pathname === '/content'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Content
            </Link>
            <Link 
              href="/preview"
              className={`px-4 py-2 text-sm transition-colors ${
                pathname === '/preview'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Preview
            </Link>
          </div>

          {currentProject ? (
            <>
              <div className="max-w-2xl mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <h1 className="text-3xl font-medium">
                    {projectMetadata?.title || formatProjectName(currentProject.name)}
                  </h1>
                  <button
                    onClick={() => toggleProjectVisibility(currentProject)}
                    className={`p-2 rounded-full transition-colors ${
                      contentMap?.projects[currentProject.name]?.visible
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {contentMap?.projects[currentProject.name]?.visible ? (
                      <EyeIcon className="w-5 h-5" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-gray-600">
                  {projectMetadata?.description || 
                    "Lorem ipsum dolor sit amet consectetur. Sit dictum quis justo massa. Ut diam id duis semper enim cras enim. Eleifend et hendrerit semper purus."}
                </p>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {showAll ? 'Show Visible Only' : 'Show All'}
                    </button>
                  </div>
                <div className="grid grid-cols-6 gap-4">
                    {images
                      .filter(image => {
                        if (showAll) return true;
                        const isVisible = contentMap?.projects[currentProject.name]?.items[image.path]?.visible ?? true;
                        return isVisible;
                      })
                      .map((image, index) => {
                        const isVisible = contentMap?.projects[currentProject.name]?.items[image.path]?.visible ?? true;
                        return (
                    <div
                      key={image.path}
                            className={`group aspect-square relative overflow-hidden bg-gray-100 ${!isVisible ? 'opacity-50' : ''}`}
                    >
                      {/\.mp4$/i.test(image.name) ? (
                        <video
                          src={`/api/images?path=${encodeURIComponent(image.path)}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ background: '#000' }}
                          muted
                          playsInline
                          loading="lazy"
                          onMouseEnter={e => { e.currentTarget.play(); e.currentTarget.loop = true; }}
                          onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.loop = false; }}
                        />
                      ) : (
                        <button
                          className="absolute inset-0 w-full h-full cursor-zoom-in"
                          onClick={() => setLightboxIndex(index)}
                        >
                          <Image
                            src={`/api/images?path=${encodeURIComponent(image.path)}`}
                            alt={image.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 25vw, (max-width: 1024px) 16.66vw, 12.5vw"
                            loading="lazy"
                          />
                        </button>
                      )}
                            <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImageVisibility(image);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-75 z-10"
                      >
                              {contentMap?.projects[currentProject.name]?.items[image.path]?.visible === false ? (
                                <EyeSlashIcon className="w-4 h-4" />
                              ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                            </button>
                    </div>
                        );
                      })}
                </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg">Select a project to view images</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <Lightbox
        images={images}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
} 