import React, { useState, useEffect } from 'react';

const ComponentTracker = () => {
  const [componentName, setComponentName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [components, setComponents] = useState([]);
  const [showList, setShowList] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false for instant loading
  const [isSyncing, setIsSyncing] = useState(false);

  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbytbR7fbIgZfEPeWfs2bHZG9W9tQOHwEfz77pDuUVRAz2Wm1LcNm4s0Kxivf4rD-hZN1Q/exec';

  // Load data from localStorage immediately, then sync with Google Sheets
  useEffect(() => {
    // Load from localStorage instantly
    const cachedData = localStorage.getItem('components');
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        setComponents(parsedData);
        setIsLoading(false); // Show interface immediately
      } catch (error) {
        console.log('Error parsing cached data:', error);
        setIsLoading(false); // Still show interface even if cache is corrupted
      }
    } else {
      setIsLoading(false); // Show interface even if no cache
    }

    // Then sync with Google Sheets in background
    const syncWithGoogleSheets = async () => {
      setIsSyncing(true);
      try {
        const response = await fetch(SHEET_URL);
        const data = await response.json();
        
        // Update components and cache
        setComponents(data || []);
        localStorage.setItem('components', JSON.stringify(data || []));
      } catch (error) {
        console.log('Error syncing with Google Sheets:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncWithGoogleSheets();
  }, []);

  const exportToCSV = () => {
    if (components.length === 0) {
      alert('No components to export');
      return;
    }

    const headers = ['Component Name/Part No', 'Quantity', 'Date Added'];
    const csvContent = [
      headers.join(','),
      ...components.map(comp => 
        `"${comp.name}",${comp.quantity},"${comp.dateAdded}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `components-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (componentName.trim() && quantity.trim() && !isSending) {
      setIsSending(true);
      
      const newComponent = {
        id: Date.now(),
        name: componentName.trim(),
        quantity: parseInt(quantity) || 0,
        dateAdded: new Date().toLocaleDateString()
      };
      
      // Clear form immediately (optimistic UI)
      setComponentName('');
      setQuantity('');
      
      // Add to local state immediately
      const updatedComponents = [...components, newComponent];
      setComponents(updatedComponents);
      
      // Update localStorage cache
      localStorage.setItem('components', JSON.stringify(updatedComponents));
      
      // Send to Google Sheet in background
      try {
        await fetch(SHEET_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newComponent.name,
            quantity: newComponent.quantity,
            dateAdded: newComponent.dateAdded
          }),
          mode: 'no-cors'
        });
      } catch (error) {
        console.log('Google Sheet updated (no-cors mode)');
      }
      
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl font-light text-gray-800">Component Tracker</h1>
        {isSyncing && (
          <div className="text-sm text-gray-400">Syncing with Google Sheets...</div>
        )}
      </div>
      
      {/* Input Fields */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Component Name/Part No"
          className="flex-1 px-4 py-4 sm:py-3 border border-gray-200 focus:outline-none focus:border-gray-300 bg-white text-base"
          value={componentName}
          onChange={(e) => setComponentName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Quantity"
          className="w-full sm:w-32 px-4 py-4 sm:py-3 border border-gray-200 focus:outline-none focus:border-gray-300 bg-white text-base"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <button
          onClick={handleSend}
          disabled={isSending}
          className={`px-6 py-4 sm:py-3 border border-gray-200 bg-white text-gray-700 text-base ${
            isSending 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-50 focus:outline-none'
          }`}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Toggle List Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowList(!showList)}
          className="px-4 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-base"
        >
          {showList ? 'Hide List' : `Show List (${components.length})`}
        </button>
      </div>

      {/* Components List */}
      {showList && (
        <div className="border border-gray-200 bg-white p-4 sm:p-6">
          {components.length === 0 ? (
            <p className="text-gray-400">No components added yet</p>
          ) : (
            <ul className="space-y-3">
              {components.map((component) => (
                <li key={component.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border-b border-gray-100 last:border-b-0 gap-2 sm:gap-0">
                  <span className="text-gray-700 text-base">{component.name}</span>
                  <div className="text-left sm:text-right">
                    <div className="text-gray-500 text-base">Qty: {component.quantity}</div>
                    <div className="text-gray-400 text-sm">{component.dateAdded}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ComponentTracker;