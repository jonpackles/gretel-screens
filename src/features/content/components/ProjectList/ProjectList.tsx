import { FileItem } from '../../types';

interface ProjectListProps {
  projects: FileItem[];
  selectedProject: FileItem | null;
  onSelectProject: (project: FileItem) => void;
}

export function ProjectList({ projects, selectedProject, onSelectProject }: ProjectListProps) {
  return (
    <div className="w-[240px] border-r border-gray-200 p-6 space-y-2 overflow-y-auto h-screen">
      <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-4">Projects</h2>
      {projects.map(project => (
        <div
          key={project.path}
          onClick={() => onSelectProject(project)}
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
  );
} 