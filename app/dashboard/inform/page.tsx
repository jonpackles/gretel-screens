'use client';

import { useState, useEffect } from 'react';

interface GoogleDataState {
  calendarEvents: any[];
  sheetProjects: any[];
  processedContent: any[];
  calendarError: string | null;
  sheetsError: string | null;
  informError: string | null;
  lastUpdated: string | null;
  loading: boolean;
}

export default function InformMonitor() {
  const [data, setData] = useState<GoogleDataState>({
    calendarEvents: [],
    sheetProjects: [],
    processedContent: [],
    calendarError: null,
    sheetsError: null,
    informError: null,
    lastUpdated: null,
    loading: true,
  });

  const [selectedTab, setSelectedTab] = useState<'calendar' | 'projects'>('calendar');
  const [editingField, setEditingField] = useState<string | null>(null); // contentId:fieldName format
  const [editValue, setEditValue] = useState<string>('');
  const [contentOverrides, setContentOverrides] = useState<any>({});
  const [resettingContent, setResettingContent] = useState<string | null>(null);

  const broadcastUpdate = () => {
    // Notify all displays that content has been updated
    try {
      const channel = new BroadcastChannel('inform-content-updates');
      channel.postMessage({ type: 'content-updated' });
      channel.close();
      console.log('📡 Broadcasted content update signal to displays');
    } catch (error) {
      console.error('Failed to broadcast update:', error);
    }
  };

  const fetchContentOverrides = async () => {
    try {
      const res = await fetch('/api/inform/content?action=list-all');
      if (res.ok) {
        const overrides = await res.json();
        setContentOverrides(overrides);
      }
    } catch (error) {
      console.error('Failed to fetch content overrides:', error);
    }
  };

  const toggleContentVisibility = async (contentId: string) => {
    try {
      const res = await fetch('/api/inform/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-visibility',
          contentId
        })
      });
      
      if (res.ok) {
        await fetchContentOverrides();
        await fetchData(); // Refresh processed content
        broadcastUpdate(); // Notify displays
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const startFieldEdit = (contentId: string, fieldName: string, currentValue: string) => {
    setEditingField(`${contentId}:${fieldName}`);
    setEditValue(currentValue || '');
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveFieldEdit = async (contentId: string, fieldName: string) => {
    try {
      let processedValue: any = editValue;
      
      // Handle special field types
      if (fieldName === 'team') {
        processedValue = editValue.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const overrides: any = { [fieldName]: processedValue };
      
      const res = await fetch('/api/inform/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-overrides',
          contentId,
          overrides
        })
      });
      
      if (res.ok) {
        await fetchContentOverrides();
        await fetchData(); // Refresh processed content
        setEditingField(null);
        setEditValue('');
        broadcastUpdate(); // Notify displays
      }
    } catch (error) {
      console.error('Failed to save field edit:', error);
    }
  };

  const resetContent = async (contentId: string) => {
    try {
      setResettingContent(contentId);
      
      // Cancel any ongoing edits for this content
      if (editingField && editingField.startsWith(`${contentId}:`)) {
        setEditingField(null);
        setEditValue('');
      }
      
      const res = await fetch('/api/inform/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          contentId
        })
      });
      
      if (res.ok) {
        // Refresh both overrides and processed content in parallel
        await Promise.all([
          fetchContentOverrides(),
          fetchData()
        ]);
        broadcastUpdate(); // Notify displays
        console.log('✅ Content reset successfully for:', contentId);
      } else {
        console.error('Failed to reset content - server response not ok');
      }
    } catch (error) {
      console.error('Failed to reset content:', error);
    } finally {
      setResettingContent(null);
    }
  };

  const fetchData = async () => {
    setData(prev => ({ ...prev, loading: true }));
    const timestamp = new Date().toISOString();

    try {
      // Fetch processed content from your existing API (include hidden items for dashboard)
      const informRes = await fetch('/api/inform?includeHidden=true');
      const processedContent = informRes.ok ? await informRes.json() : [];
      const informError = informRes.ok ? null : 'Failed to fetch processed content';

      // Fetch raw calendar data
      let calendarEvents = [];
      let calendarError = null;
      try {
        const calendarRes = await fetch('/api/calendar');
        calendarEvents = calendarRes.ok ? await calendarRes.json() : [];
        if (!calendarRes.ok) calendarError = 'Failed to fetch calendar events';
      } catch (err) {
        calendarError = err instanceof Error ? err.message : 'Calendar fetch failed';
      }

      // Fetch raw sheets data
      let sheetProjects = [];
      let sheetsError = null;
      try {
        const sheetsRes = await fetch('/api/dashboard/inform/sheets');
        sheetProjects = sheetsRes.ok ? await sheetsRes.json() : [];
        if (!sheetsRes.ok) sheetsError = 'Failed to fetch sheets data';
      } catch (err) {
        sheetsError = err instanceof Error ? err.message : 'Sheets fetch failed';
      }

      setData({
        calendarEvents,
        sheetProjects,
        processedContent,
        calendarError,
        sheetsError,
        informError,
        lastUpdated: timestamp,
        loading: false,
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        informError: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  };

  useEffect(() => {
    fetchData();
    fetchContentOverrides();
  }, []);

  const InlineEditField = ({ 
    contentId, 
    fieldName, 
    currentValue, 
    displayValue, 
    label, 
    type = 'text',
    isTextarea = false 
  }: { 
    contentId: string;
    fieldName: string;
    currentValue: string;
    displayValue: string | React.ReactNode;
    label: string;
    type?: string;
    isTextarea?: boolean;
  }) => {
    const isEditing = editingField === `${contentId}:${fieldName}`;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-600">{label}:</span>
          {isTextarea ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
              rows={2}
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
              autoFocus
            />
          )}
          <button
            onClick={() => saveFieldEdit(contentId, fieldName)}
            className="px-2 py-1 bg-green-100 text-green-800 hover:bg-green-200 rounded text-xs"
          >
            ✓
          </button>
          <button
            onClick={cancelFieldEdit}
            className="px-2 py-1 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded text-xs"
          >
            ✕
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 group">
        <span className="font-medium text-sm text-gray-600">{label}:</span>
        <span className="text-sm text-gray-700">{displayValue}</span>
        <button
          onClick={() => startFieldEdit(contentId, fieldName, currentValue)}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
          title={`Edit ${label.toLowerCase()}`}
        >
          ✏️
        </button>
      </div>
    );
  };

  const ImageEditField = ({ contentId, currentImageUrl }: { contentId: string; currentImageUrl: string }) => {
    const isEditing = editingField === `${contentId}:imageUrl`;
    
    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-600">Image URL:</span>
            <input
              type="url"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter image URL"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
              autoFocus
            />
            <button
              onClick={() => saveFieldEdit(contentId, 'imageUrl')}
              className="px-2 py-1 bg-green-100 text-green-800 hover:bg-green-200 rounded text-xs"
            >
              ✓
            </button>
            <button
              onClick={cancelFieldEdit}
              className="px-2 py-1 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded text-xs"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm text-gray-600">Or upload a new image:</div>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append('image', file);
              formData.append('contentId', contentId);
              
              try {
                const res = await fetch('/api/inform/image-upload', {
                  method: 'POST',
                  body: formData
                });
                
                if (res.ok) {
                  const { imageUrl } = await res.json();
                  setEditValue(imageUrl);
                } else {
                  const error = await res.json();
                  alert(`Failed to upload image: ${error.error}`);
                }
              } catch (error) {
                alert('Upload error: ' + error);
              }
            }}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          {editValue && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Preview:</span>
              <img src={editValue} alt="Preview" className="w-16 h-16 object-cover rounded border" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 group">
        <span className="font-medium text-sm text-gray-600">Image:</span>
        {currentImageUrl ? (
          <img src={currentImageUrl} alt="Event" className="w-20 h-20 object-cover rounded border" />
        ) : (
          <span className="text-sm text-gray-500">No image</span>
        )}
        <button
          onClick={() => startFieldEdit(contentId, 'imageUrl', currentImageUrl)}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
          title="Edit image"
        >
          ✏️
        </button>
      </div>
    );
  };

  const renderCalendarData = () => (
    <div className="space-y-4">
      {data.calendarError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-medium">Calendar Error</h4>
          <p className="text-red-600 text-sm mt-1">{data.calendarError}</p>
        </div>
      ) : (
        data.calendarEvents.map((event, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900">{event.title}</h4>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.type === 'internal' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {event.type}
                </span>
                {event.tag && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {event.tag}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Date:</span> {event.date}
              </div>
              <div>
                <span className="font-medium">Time:</span> {event.time}
              </div>
              {event.location && (
                <div>
                  <span className="font-medium">Location:</span> {event.location}
                </div>
              )}
              {event.url && (
                <div>
                  <span className="font-medium">URL:</span> 
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    Link
                  </a>
                </div>
              )}
            </div>
            {event.description && (
              <div className="mt-2">
                <span className="font-medium text-sm text-gray-600">Description:</span>
                <p className="text-sm text-gray-700 mt-1">{event.description}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderSheetsData = () => (
    <div className="space-y-4">
      {data.sheetsError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-medium">Sheets Error</h4>
          <p className="text-red-600 text-sm mt-1">{data.sheetsError}</p>
        </div>
      ) : (
        data.sheetProjects.map((project, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900">{project.title}</h4>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                project.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                project.status === 'Shipped' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-gray-700 mb-2">{project.description}</p>
            )}
            {project.team && project.team.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <span className="text-sm font-medium text-gray-600">Team:</span>
                {project.team.map((member: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    {member}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderProcessedData = (filterType?: 'event' | 'project') => {
    const filteredData = filterType 
      ? data.processedContent.filter(item => {
          if (filterType === 'event') {
            return item.type === 'event' || item.type === 'announcement';
          }
          return item.type === filterType;
        })
      : data.processedContent;

    return (
      <div className="space-y-4">
        {data.informError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-red-800 font-medium">Processed Content Error</h4>
            <p className="text-red-600 text-sm mt-1">{data.informError}</p>
          </div>
        ) : (
          filteredData.map((item, index) => {
            const override = contentOverrides[item.id];
            const isHidden = override?.visibility === 'hidden';
            const hasOverrides = override?.overrides && Object.keys(override.overrides).length > 0;
            
            return (
              <div key={index} className={`border border-gray-200 rounded-lg p-4 bg-white ${isHidden ? 'opacity-50 bg-gray-50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{item.data.title}</h4>
                    {hasOverrides && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Edited
                      </span>
                    )}
                    {isHidden && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        Hidden
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === 'event' ? 'bg-blue-100 text-blue-800' :
                      item.type === 'announcement' ? 'bg-yellow-100 text-yellow-800' :
                      item.type === 'project' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.internal ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.internal ? 'Internal' : 'External'}
                    </span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => toggleContentVisibility(item.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      isHidden 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {isHidden ? 'Show' : 'Hide'}
                  </button>
                  
                  {hasOverrides && (
                    <button
                      onClick={() => resetContent(item.id)}
                      disabled={resettingContent === item.id}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        resettingContent === item.id
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                      }`}
                    >
                      {resettingContent === item.id ? 'Resetting...' : 'Reset All'}
                    </button>
                  )}
                </div>

                {/* Content with Inline Editing */}
                <div className="space-y-3">
                  {/* Title - always editable */}
                  <InlineEditField
                    contentId={item.id}
                    fieldName="title"
                    currentValue={override?.overrides?.title || item.data.title}
                    displayValue={override?.overrides?.title || item.data.title}
                    label="Title"
                  />

                  {item.type === 'project' ? (
                    /* Project Fields */
                    <>
                      <InlineEditField
                        contentId={item.id}
                        fieldName="description"
                        currentValue={override?.overrides?.description || item.data.description || ''}
                        displayValue={override?.overrides?.description || item.data.description || 'No description'}
                        label="Description"
                        isTextarea={true}
                      />
                      <InlineEditField
                        contentId={item.id}
                        fieldName="status"
                        currentValue={override?.overrides?.status || item.data.status || ''}
                        displayValue={override?.overrides?.status || item.data.status || 'No status'}
                        label="Status"
                      />
                      <div className="flex items-center gap-2 group">
                        <span className="font-medium text-sm text-gray-600">Team:</span>
                        <div className="flex gap-1 flex-wrap">
                          {(override?.overrides?.team || item.data.team || []).length > 0 ? (
                            (override?.overrides?.team || item.data.team || []).map((member: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {member}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No team assigned</span>
                          )}
                        </div>
                        <button
                          onClick={() => startFieldEdit(item.id, 'team', override?.overrides?.team ? override.overrides.team.join(', ') : (item.data.team ? item.data.team.join(', ') : ''))}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                          title="Edit team"
                        >
                          ✏️
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Event/Announcement Fields */
                    <>
                      <InlineEditField
                        contentId={item.id}
                        fieldName="date"
                        currentValue={override?.overrides?.date || item.data.date || ''}
                        displayValue={override?.overrides?.date || item.data.date || 'No start date'}
                        label="Start Date"
                        type="date"
                      />
                      <InlineEditField
                        contentId={item.id}
                        fieldName="endDate"
                        currentValue={override?.overrides?.endDate || item.data.endDate || ''}
                        displayValue={override?.overrides?.endDate || item.data.endDate || 'No end date'}
                        label="End Date"
                        type="date"
                      />
                      <InlineEditField
                        contentId={item.id}
                        fieldName="time"
                        currentValue={override?.overrides?.time || item.data.time || ''}
                        displayValue={override?.overrides?.time || item.data.time || 'No time set'}
                        label="Time"
                      />
                      <InlineEditField
                        contentId={item.id}
                        fieldName="location"
                        currentValue={override?.overrides?.location || item.data.location || ''}
                        displayValue={override?.overrides?.location || item.data.location || 'No location'}
                        label="Location"
                      />
                      <InlineEditField
                        contentId={item.id}
                        fieldName="tag"
                        currentValue={override?.overrides?.tag || item.data.tag || ''}
                        displayValue={override?.overrides?.tag || item.data.tag || 'No tag'}
                        label="Tag"
                      />
                      <div className="flex items-center gap-2 group">
                        <span className="font-medium text-sm text-gray-600">URL:</span>
                        {(override?.overrides?.url || item.data.url) ? (
                          <a href={override?.overrides?.url || item.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            View Event
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">No URL</span>
                        )}
                        <button
                          onClick={() => startFieldEdit(item.id, 'url', override?.overrides?.url || item.data.url || '')}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                          title="Edit URL"
                        >
                          ✏️
                        </button>
                      </div>
                      <ImageEditField
                        contentId={item.id}
                        currentImageUrl={override?.overrides?.imageUrl || item.data.imageUrl || ''}
                      />
                      <InlineEditField
                        contentId={item.id}
                        fieldName={item.type === 'announcement' ? 'body' : 'description'}
                        currentValue={item.type === 'announcement' ? (override?.overrides?.body || item.data.body || '') : (override?.overrides?.description || item.data.description || '')}
                        displayValue={item.type === 'announcement' ? (override?.overrides?.body || item.data.body || 'No body text') : (override?.overrides?.description || item.data.description || 'No description')}
                        label={item.type === 'announcement' ? 'Body' : 'Description'}
                        isTextarea={true}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Inform Data Monitor</h1>
          <button
            onClick={fetchData}
            disabled={data.loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {data.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {data.lastUpdated && (
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'calendar', label: 'Calendar Events', count: data.processedContent.filter(item => item.type === 'event' || item.type === 'announcement').length },
            { key: 'projects', label: 'Projects', count: data.processedContent.filter(item => item.type === 'project').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedTab === 'calendar' && renderProcessedData('event')}
        {selectedTab === 'projects' && renderProcessedData('project')}
      </div>
    </div>
  );
} 