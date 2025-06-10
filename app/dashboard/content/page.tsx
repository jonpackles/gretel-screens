'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import LazyVideo from '@/components/LazyVideo';

type FileItem = {
  name: string;
  type: 'file' | 'directory';
  path: string;
  project?: string;
};

export default function ContentDashboard() {
  const [projects, setProjects] = useState<FileItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<FileItem | null>(null);
  const [media, setMedia] = useState<FileItem[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [pendingRenames, setPendingRenames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/media?path=linked-content/projects');
        const data = await res.json();
        const folders = data.items?.filter((item: FileItem) => {
          return item.type === 'directory' &&
            item.path.startsWith('linked-content/projects/') &&
            !item.path.substring('linked-content/projects/'.length).includes('/');
        }) || [];
        setProjects(folders);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, []);

  const handleSelectProject = async (project: FileItem) => {
    setSelectedProject(project);
    setPendingRenames({});
    try {
      const res = await fetch(`/api/media?path=${encodeURIComponent(project.path)}&recursive=true`);
      const data = await res.json();
      const mediaFiles = data.items?.filter((item: FileItem) =>
        item.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name)
      ) || [];
      setMedia(mediaFiles);
    } catch (error) {
      console.error('Error fetching project media:', error);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && focusedIndex !== null) {
        const item = media[focusedIndex];
        const staged = pendingRenames[item.path];
        const currentName = staged ?? item.name;
        const isHidden = currentName.startsWith('_hide_');
        const newName = isHidden
          ? currentName.replace(/^_hide_/, '')
          : `_hide_${currentName}`;

        setPendingRenames(prev => ({
          ...prev,
          [item.path]: newName
        }));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusedIndex, media, pendingRenames]);

  const applyRenames = async () => {
    const entries = Object.entries(pendingRenames);
    for (const [oldPath, newName] of entries) {
      await fetch('/api/rename', {
        method: 'POST',
        body: JSON.stringify({ oldPath, newName }),
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (selectedProject) await handleSelectProject(selectedProject);
  };

  const getEffectiveName = (item: FileItem): string => {
    return pendingRenames[item.path] ?? item.name;
  };

  const isStaged = (item: FileItem) => item.path in pendingRenames;

  const isEffectivelyHidden = (item: FileItem) => getEffectiveName(item).startsWith('_hide_');

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <div className="w-[240px] border-r border-gray-200 p-6 space-y-2 overflow-y-auto h-screen">
        <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-4">Projects</h2>
        {projects.map(project => (
          <div
            key={project.path}
            onClick={() => handleSelectProject(project)}
            className={`block w-full text-left text-sm px-2 py-1 rounded overflow-hidden cursor-pointer ${
              selectedProject?.path === project.path
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {project.name}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 p-10">
        {selectedProject ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold">{selectedProject.name}</h1>
              <div className="space-x-2">
                {Object.keys(pendingRenames).length > 0 && (
                  <>
                    <button
                      onClick={applyRenames}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
                    >
                      Save Changes ({Object.keys(pendingRenames).length})
                    </button>
                    <button
                      onClick={() => setPendingRenames({})}
                      className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-2 rounded"
                    >
                      Reset Changes
                    </button>
                  </>
                )}
                {media.length > 0 && (
                  <button
                    onClick={() => {
                      const allHidden = media.every(item =>
                        (pendingRenames[item.path] ?? item.name).startsWith('_hide_')
                      );
                      const newRenames: Record<string, string> = {};
                      media.forEach(item => {
                        const effectiveName = pendingRenames[item.path] ?? item.name;
                        const shouldHide = !allHidden; // toggle based on current majority
                        newRenames[item.path] = shouldHide
                          ? effectiveName.startsWith('_hide_') ? effectiveName : `_hide_${effectiveName}`
                          : effectiveName.replace(/^_hide_/, '');
                      });
                      setPendingRenames(newRenames);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-3 py-2 rounded"
                  >
                    {media.every(item => (pendingRenames[item.path] ?? item.name).startsWith('_hide_'))
                      ? 'Unhide All'
                      : 'Hide All'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {media.map((item, index) => {
                const isHidden = isEffectivelyHidden(item);
                const staged = isStaged(item);
                const isFocused = index === focusedIndex;

                return (
                  <div
                    key={item.path}
                    tabIndex={0}
                    onFocus={() => setFocusedIndex(index)}
                    className={`relative aspect-square overflow-hidden bg-gray-100 transition-all outline-none focus:ring-2 focus:ring-yellow-400 rounded ${
                      isHidden ? 'opacity-50 grayscale' : ''
                    } ${staged ? 'ring-2 ring-yellow-500' : ''} ${isFocused ? 'outline outline-blue-500' : ''}`}
                  >
                    {/\.mp4$/i.test(item.name) ? (
                      <LazyVideo
                        src={`/content/${item.path}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        unoptimized
                        src={`/content/${item.path}`}
                        alt={item.name}
                        fill
                        loading="lazy"
                        className="object-cover"
                        sizes="(max-width: 768px) 25vw, (max-width: 1024px) 20vw, 15vw"
                      />
                    )}

                    {staged && (
                      <div className="absolute bottom-1 right-1 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded">
                        Pending
                      </div>
                    )}

                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded text-center">
                      {getEffectiveName(item).replace(/\.[^/.]+$/, '').substring(0, 20)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-xl text-gray-500 mb-2">Select a project</h2>
            <p className="text-gray-400">Choose a project from the sidebar to view and manage its media files.</p>
          </div>
        )}
      </div>
    </div>
  );
}