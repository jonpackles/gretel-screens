'use client';

import { useState, useEffect } from 'react';
import { ProjectList } from '../ProjectList';
import { MediaGrid } from '../MediaGrid';
import { ContentService } from '../../services/contentService';
import { FileItem } from '../../types';

export function ContentDashboard() {
  const [projects, setProjects] = useState<FileItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<FileItem | null>(null);
  const [media, setMedia] = useState<FileItem[]>([]);
  const [pendingVisibilityChanges, setPendingVisibilityChanges] = useState<Record<string, 'visible' | 'hidden'>>({});

  useEffect(() => {
    const fetchProjects = async () => {
      console.log('Fetching projects...');
      const projectList = await ContentService.fetchProjects();
      console.log('Projects loaded:', projectList.length, projectList);
      setProjects(projectList);
    };
    fetchProjects();
  }, []);

  const handleSelectProject = async (project: FileItem) => {
    console.log('Selecting project:', project.name);
    setSelectedProject(project);
    setPendingVisibilityChanges({});
    const mediaFiles = await ContentService.fetchProjectMedia(project.path);
    console.log('Media files loaded for project:', mediaFiles.length, mediaFiles.slice(0, 3));
    setMedia(mediaFiles);
  };

  const handleToggleVisibility = (item: FileItem) => {
    const currentVisibility = pendingVisibilityChanges[item.path] ?? item.visibility ?? 'visible';
    const newVisibility = currentVisibility === 'visible' ? 'hidden' : 'visible';

    setPendingVisibilityChanges(prev => ({
      ...prev,
      [item.path]: newVisibility
    }));
  };

  const applyVisibilityChanges = async () => {
    try {
      await ContentService.batchUpdateVisibility(pendingVisibilityChanges);
      setPendingVisibilityChanges({});
      if (selectedProject) {
        // Refresh project data to get updated visibility states
        const mediaFiles = await ContentService.fetchProjectMedia(selectedProject.path, true);
        setMedia(mediaFiles);
      }
    } catch (error) {
      console.error('Error applying visibility changes:', error);
    }
  };

  const resetChanges = () => {
    setPendingVisibilityChanges({});
  };

  const toggleVisibilityAll = () => {
    const allHidden = media.every(item => {
      const effectiveVisibility = pendingVisibilityChanges[item.path] ?? item.visibility ?? 'visible';
      return effectiveVisibility === 'hidden';
    });
    
    const newVisibility = allHidden ? 'visible' : 'hidden';
    const updates: Record<string, 'visible' | 'hidden'> = {};
    
    media.forEach(item => {
      updates[item.path] = newVisibility;
    });
    
    setPendingVisibilityChanges(updates);
  };

  return (
    <div className="flex h-full">
      <ProjectList
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
      />
      
      <div className="flex-1 p-6">
        {selectedProject ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-black">{selectedProject.name}</h1>
              <div className="space-x-2">
                {Object.keys(pendingVisibilityChanges).length > 0 && (
                  <>
                    <button
                      onClick={applyVisibilityChanges}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
                    >
                      Save Changes ({Object.keys(pendingVisibilityChanges).length})
                    </button>
                    <button
                      onClick={resetChanges}
                      className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-2 rounded"
                    >
                      Reset Changes
                    </button>
                  </>
                )}
                {media.length > 0 && (
                  <button
                    onClick={toggleVisibilityAll}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-3 py-2 rounded"
                  >
                    {media.every(item => {
                      const effectiveVisibility = pendingVisibilityChanges[item.path] ?? item.visibility ?? 'visible';
                      return effectiveVisibility === 'hidden';
                    }) ? 'Show All' : 'Hide All'}
                  </button>
                )}
              </div>
            </div>

            <MediaGrid
              media={media}
              pendingVisibilityChanges={pendingVisibilityChanges}
              onToggleVisibility={handleToggleVisibility}
            />
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