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

  const [selectedTab, setSelectedTab] = useState<'calendar' | 'sheets' | 'processed-calendar' | 'processed-projects'>('processed-calendar');
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [contentOverrides, setContentOverrides] = useState<any>({});

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

  const startEditing = (item: any) => {
    setEditingContent(item.id);
    setEditForm({
      title: item.data.title || '',
      description: item.data.description || '',
      body: item.data.body || '',
      date: item.data.date || '',
      time: item.data.time || '',
      location: item.data.location || '',
      tag: item.data.tag || '',
      url: item.data.url || '',
      team: item.data.team ? item.data.team.join(', ') : '',
      status: item.data.status || '',
      imageUrl: item.data.imageUrl || '',
      endDate: item.data.endDate || '',
    });
  };

  const cancelEditing = () => {
    setEditingContent(null);
    setEditForm({});
  };

  const saveContentEdit = async (contentId: string) => {
    try {
      const overrides: any = {};
      
      Object.entries(editForm).forEach(([key, value]) => {
        if (value && value !== '') {
          if (key === 'team') {
            overrides[key] = (value as string).split(',').map(s => s.trim()).filter(Boolean);
          } else {
            overrides[key] = value;
          }
        }
      });
      
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
        setEditingContent(null);
        setEditForm({});
        broadcastUpdate(); // Notify displays
      }
    } catch (error) {
      console.error('Failed to save content edit:', error);
    }
  };

  const resetContent = async (contentId: string) => {
    try {
      const res = await fetch('/api/inform/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          contentId
        })
      });
      
      if (res.ok) {
        await fetchContentOverrides();
        await fetchData(); // Refresh processed content
        broadcastUpdate(); // Notify displays
      }
    } catch (error) {
      console.error('Failed to reset content:', error);
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

  const StatusBadge = ({ error, count }: { error: string | null; count: number }) => (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-600">
        {error ? 'Error' : `${count} items`}
      </span>
    </div>
  );

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
            const isEditing = editingContent === item.id;
            
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
                  
                  {!isEditing ? (
                    <button
                      onClick={() => startEditing(item)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-xs font-medium"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => saveContentEdit(item.id)}
                        className="px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200 rounded text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  
                  {hasOverrides && (
                    <button
                      onClick={() => resetContent(item.id)}
                      className="px-3 py-1 bg-orange-100 text-orange-800 hover:bg-orange-200 rounded text-xs font-medium"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Edit Form */}
                {isEditing ? (
                  <div className="space-y-3 bg-gray-50 p-3 rounded border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      
                      {item.type === 'project' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <input
                              type="text"
                              value={editForm.status || ''}
                              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team (comma-separated)</label>
                            <input
                              type="text"
                              value={editForm.team || ''}
                              onChange={(e) => setEditForm({...editForm, team: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={editForm.date || ''}
                              onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                            <input
                              type="date"
                              value={editForm.endDate || ''}
                              onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input
                              type="text"
                              value={editForm.time || ''}
                              onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                              type="text"
                              value={editForm.location || ''}
                              onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                            <input
                              type="text"
                              value={editForm.tag || ''}
                              onChange={(e) => setEditForm({...editForm, tag: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                            <input
                              type="url"
                              value={editForm.url || ''}
                              onChange={(e) => setEditForm({...editForm, url: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Image Upload Section */}
                    {item.type !== 'project' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Image</label>
                        <div className="space-y-2">
                          {/* Current Image Display */}
                          {(editForm.imageUrl || item.data.imageUrl) && (
                            <div className="flex items-center gap-2">
                              <img 
                                src={editForm.imageUrl || item.data.imageUrl} 
                                alt="Event" 
                                className="w-16 h-16 object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => setEditForm({...editForm, imageUrl: ''})}
                                className="px-2 py-1 bg-red-100 text-red-800 hover:bg-red-200 rounded text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          
                          {/* Upload Input */}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              const formData = new FormData();
                              formData.append('image', file);
                              formData.append('contentId', item.id);
                              
                              try {
                                const res = await fetch('/api/inform/image-upload', {
                                  method: 'POST',
                                  body: formData
                                });
                                
                                if (res.ok) {
                                  const { imageUrl } = await res.json();
                                  setEditForm({...editForm, imageUrl});
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
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {item.type === 'announcement' ? 'Body' : 'Description'}
                      </label>
                      <textarea
                        value={item.type === 'announcement' ? (editForm.body || '') : (editForm.description || '')}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          [item.type === 'announcement' ? 'body' : 'description']: e.target.value
                        })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  /* Display Content */
                  item.type === 'project' ? (
                    <div className="space-y-2">
                      {item.data.description && (
                        <p className="text-sm text-gray-700">{item.data.description}</p>
                      )}
                      {item.data.team && (
                        <div className="flex gap-1 flex-wrap">
                          <span className="text-sm font-medium text-gray-600">Team:</span>
                          {item.data.team.map((member: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              {member}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.data.status && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">Status:</span> {item.data.status}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.data.date && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Date:</span> {
                            item.data.endDate && item.data.endDate !== item.data.date
                              ? `${item.data.date} - ${item.data.endDate}`
                              : item.data.date
                          }
                          {item.data.time && !(item.data.endDate && item.data.endDate !== item.data.date) && <span className="ml-2">{item.data.time}</span>}
                        </div>
                      )}
                      {item.data.location && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Location:</span> {item.data.location}
                        </div>
                      )}
                      {item.data.imageUrl && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Image:</span>
                          <img src={item.data.imageUrl} alt="Event" className="mt-1 w-20 h-20 object-cover rounded border" />
                        </div>
                      )}
                      {(item.data.description || item.data.body) && (
                        <p className="text-sm text-gray-700">{item.data.description || item.data.body}</p>
                      )}
                      {item.data.url && (
                        <a href={item.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          View Event
                        </a>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
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

      {/* Status Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Google Calendar</h3>
          <StatusBadge error={data.calendarError} count={data.calendarEvents.length} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Google Sheets</h3>
          <StatusBadge error={data.sheetsError} count={data.sheetProjects.length} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Processed Events</h3>
          <StatusBadge error={data.informError} count={data.processedContent.filter(item => item.type === 'event' || item.type === 'announcement').length} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Processed Projects</h3>
          <StatusBadge error={data.informError} count={data.processedContent.filter(item => item.type === 'project').length} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'processed-calendar', label: 'Processed Calendar', count: data.processedContent.filter(item => item.type === 'event' || item.type === 'announcement').length },
            { key: 'processed-projects', label: 'Processed Projects', count: data.processedContent.filter(item => item.type === 'project').length },
            { key: 'calendar', label: 'Calendar Events', count: data.calendarEvents.length },
            { key: 'sheets', label: 'Sheet Projects', count: data.sheetProjects.length },
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
      <div className="max-h-96 overflow-y-auto">
        {selectedTab === 'calendar' && renderCalendarData()}
        {selectedTab === 'sheets' && renderSheetsData()}
        {selectedTab === 'processed-calendar' && renderProcessedData('event')}
        {selectedTab === 'processed-projects' && renderProcessedData('project')}
      </div>
    </div>
  );
} 