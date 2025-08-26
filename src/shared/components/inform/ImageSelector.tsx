'use client';

import { useState, useEffect } from 'react';
import { ContentService } from '@/features/content/services/contentService';
import { FileItem } from '@/features/content/types';
import LazyVideo from '@/shared/components/LazyVideo';

// Using existing FileItem type from content system

interface ImageSelectorProps {
  projectTitle: string;  // For display purposes only
  currentImageUrl?: string;
  currentMediaUrls?: string[]; // For multiple media selection
  onImageSelect?: (imageUrl: string | null) => void; // Optional for backward compatibility
  onMediaSelect?: (mediaUrls: string[]) => void; // For multiple media selection
  isOpen: boolean;
  onClose: () => void;
  allowMultiple?: boolean; // Flag to enable multiple selection
}

export default function ImageSelector({ 
  projectTitle, 
  currentImageUrl, 
  currentMediaUrls = [],
  onImageSelect, 
  onMediaSelect,
  isOpen, 
  onClose,
  allowMultiple = false
}: ImageSelectorProps) {
  const [projects, setProjects] = useState<FileItem[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<FileItem[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<FileItem | null>(null);
  const [media, setMedia] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImageUrl || null);
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>(currentMediaUrls);
  const [step, setStep] = useState<'folder' | 'image'>('folder');

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setStep('folder');
      setSelectedProject(null);
      setMedia([]);
      setProjectFilter('');
    }
  }, [isOpen]);

  // Filter projects based on search input
  useEffect(() => {
    if (projectFilter.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(projectFilter.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projects, projectFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const projectList = await ContentService.fetchProjects();
      setProjects(projectList);
      setFilteredProjects(projectList);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMedia = async (project: FileItem) => {
    setLoading(true);
    setError('');
    try {
      const { items } = await ContentService.fetchProjectMedia(project.path, true);
      // Filter for images and videos only
      const mediaFiles = items.filter(item => 
        /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i.test(item.name)
      );
      setMedia(mediaFiles);
      setStep('image');
    } catch (err) {
      console.error('Error fetching project media:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: FileItem) => {
    setSelectedProject(project);
    fetchProjectMedia(project);
  };

  const handleBackToFolders = () => {
    setStep('folder');
    setSelectedProject(null);
    setMedia([]);
    setProjectFilter('');
  };

  const handleImageSelect = (imageUrl: string) => {
    if (allowMultiple) {
      setSelectedMediaUrls(prev => {
        if (prev.includes(imageUrl)) {
          // Remove if already selected
          return prev.filter(url => url !== imageUrl);
        } else {
          // Add to selection
          return [...prev, imageUrl];
        }
      });
    } else {
      setSelectedImage(imageUrl);
    }
  };

  const handleRemoveImage = () => {
    if (allowMultiple) {
      setSelectedMediaUrls([]);
    } else {
      setSelectedImage(null);
    }
  };

  const handleConfirm = () => {
    if (allowMultiple && onMediaSelect) {
      onMediaSelect(selectedMediaUrls);
    } else if (onImageSelect) {
      onImageSelect(selectedImage);
    }
    onClose();
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {step === 'folder' ? 'Choose Project Folder' : `Select Media for "${projectTitle}"`}
              </h3>
              {step === 'image' && selectedProject && (
                <p className="text-sm text-gray-600">From project: {selectedProject.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step === 'image' && (
                <button
                  onClick={handleBackToFolders}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                  ← Back to Folders
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">
                {step === 'folder' ? 'Loading project folders...' : 'Loading media...'}
              </div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-8">
              <p>{error}</p>
              <button 
                onClick={step === 'folder' ? fetchProjects : () => selectedProject && fetchProjectMedia(selectedProject)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          ) : step === 'folder' ? (
            /* Folder Selection */
            <>
              <div className="mb-4 text-sm text-gray-600">
                Choose which project folder contains the images/videos you want to select from:
              </div>
              
              {/* Search/Filter Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter projects... (e.g., PayPal, GitHub, etc.)"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                {projectFilter && (
                  <div className="mt-2 text-xs text-gray-500">
                    Showing {filteredProjects.length} of {projects.length} projects
                    {filteredProjects.length === 0 && (
                      <span className="text-orange-600 ml-1">- try a different search term</span>
                    )}
                  </div>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="text-gray-600 text-center py-8">
                  No projects found
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-gray-600 text-center py-8">
                  <div className="text-gray-500">No projects match "{projectFilter}"</div>
                  <button
                    onClick={() => setProjectFilter('')}
                    className="mt-2 text-blue-500 hover:text-blue-600 text-sm underline"
                  >
                    Clear filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProjects.map((project, index) => (
                    <button
                      key={index}
                      onClick={() => handleProjectSelect(project)}
                      className="p-4 border border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-xl">📁</div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{project.name}</div>
                          <div className="text-xs text-gray-500">Project folder</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Media Selection */
            <>
              {media.length === 0 ? (
                <div className="text-gray-600 text-center py-8">
                  No images or videos found in this project folder
                </div>
              ) : (
                <>
                  {/* Remove Media Option */}
                  <div className="mb-4">
                    <button
                      onClick={() => allowMultiple ? setSelectedMediaUrls([]) : setSelectedImage(null)}
                      className={`p-4 border-2 rounded-lg text-center w-full transition-colors ${
                        (allowMultiple ? selectedMediaUrls.length === 0 : selectedImage === null)
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-gray-600">
                        <div className="text-3xl mb-2">🚫</div>
                        <div className="font-medium">No Media</div>
                      </div>
                    </button>
                  </div>

                  {/* Media Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {media.map((item, index) => {
                      const mediaUrl = `/content/${item.path}`;
                      const isVideo = /\.(mp4|mov|avi|webm)$/i.test(item.name);
                      const isSelected = allowMultiple 
                        ? selectedMediaUrls.includes(mediaUrl)
                        : selectedImage === mediaUrl;
                      
                      return (
                        <div
                          key={index}
                          className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-200' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => handleImageSelect(mediaUrl)}
                        >
                          <div className="aspect-square relative">
                            {isVideo ? (
                              <LazyVideo
                                src={mediaUrl}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}
                            {/* Type badge */}
                            <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                              {isVideo ? '🎬' : '🖼️'}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {allowMultiple && isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                              {selectedMediaUrls.indexOf(mediaUrl) + 1}
                            </div>
                          )}
                          <div className="p-2 bg-gray-50">
                            <div className="text-xs text-gray-600 truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.path.includes('/') ? item.path.split('/').slice(-2, -1)[0] : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          {step === 'image' ? (
            <>
              <button
                onClick={handleRemoveImage}
                className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
              >
                Remove Media
              </button>
              <div className="space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                >
                  {allowMultiple 
                    ? selectedMediaUrls.length === 0 
                      ? 'Select Media' 
                      : selectedMediaUrls.length === 1 
                        ? 'Select 1 Media' 
                        : `Select ${selectedMediaUrls.length} Media`
                    : 'Select Media'
                  }
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
