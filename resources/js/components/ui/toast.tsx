import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

// Toast Component
interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    // Auto close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for animation
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`flex items-center p-4 border rounded-lg shadow-lg max-w-sm ${getColorClasses()}`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleClose}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  }>;
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};

// Toast Hook for managing toasts
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess: (message: string, duration?: number) => addToast(message, 'success', duration),
    showError: (message: string, duration?: number) => addToast(message, 'error', duration),
    showInfo: (message: string, duration?: number) => addToast(message, 'info', duration),
    showWarning: (message: string, duration?: number) => addToast(message, 'warning', duration),
  };
};

// API Utils with Toast Integration
let toastHandler: {
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
  showInfo?: (message: string) => void;
  showWarning?: (message: string) => void;
} = {};

const registerToastHandler = (handler: typeof toastHandler) => {
  toastHandler = handler;
};

const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  if (type === 'success' && toastHandler.showSuccess) {
    toastHandler.showSuccess(message);
  } else if (type === 'error' && toastHandler.showError) {
    toastHandler.showError(message);
  } else if (type === 'warning' && toastHandler.showWarning) {
    toastHandler.showWarning(message);
  } else if (type === 'info' && toastHandler.showInfo) {
    toastHandler.showInfo(message);
  } else {
    // Fallback to alert if toast handler not registered
    alert(`${type.toUpperCase()}: ${message}`);
  }
};

// Example API functions that use toasts
const simulateApiCall = async (type: 'success' | 'error', delay = 1000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (type === 'success') {
        showToast('Operation completed successfully!', 'success');
        resolve('Success');
      } else {
        showToast('Something went wrong. Please try again.', 'error');
        reject(new Error('API Error'));
      }
    }, delay);
  });
};

// Main Demo Component
export default function ToastDemo() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Register toast handler for API utils
  useEffect(() => {
    registerToastHandler({
      showSuccess: toast.showSuccess,
      showError: toast.showError,
      showInfo: toast.showInfo,
      showWarning: toast.showWarning,
    });
  }, [toast]);

  const handleApiTest = async (type: 'success' | 'error') => {
    setIsLoading(true);
    toast.showInfo('Processing your request...', 2000);
    
    try {
      await simulateApiCall(type);
    } catch (error) {
      // Error toast is already shown by the API function
    } finally {
      setIsLoading(false);
    }
  };

  const showMultipleToasts = () => {
    toast.showInfo('First toast');
    setTimeout(() => toast.showWarning('Second toast'), 500);
    setTimeout(() => toast.showSuccess('Third toast'), 1000);
    setTimeout(() => toast.showError('Fourth toast'), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Toast Notification System
          </h1>
          <p className="text-gray-600 mb-8">
            A comprehensive React toast notification system with animations, auto-dismiss, and API integration.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Toast Types */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Basic Toast Types</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => toast.showSuccess('Operation completed successfully!')}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Show Success Toast
                </button>
                
                <button
                  onClick={() => toast.showError('Something went wrong!')}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Show Error Toast
                </button>
                
                <button
                  onClick={() => toast.showWarning('Please check your input!')}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Show Warning Toast
                </button>
                
                <button
                  onClick={() => toast.showInfo('Here is some helpful information.')}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Show Info Toast
                </button>
              </div>
            </div>

            {/* Advanced Features */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Advanced Features</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => toast.showSuccess('This toast stays for 10 seconds!', 10000)}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Long Duration Toast (10s)
                </button>
                
                <button
                  onClick={() => toast.showInfo('Quick toast!', 1000)}
                  className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Short Duration Toast (1s)
                </button>
                
                <button
                  onClick={showMultipleToasts}
                  className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Show Multiple Toasts
                </button>
                
                <button
                  onClick={toast.clearAllToasts}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear All Toasts
                </button>
              </div>
            </div>
          </div>

          {/* API Integration Demo */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">API Integration Demo</h2>
            <p className="text-gray-600 mb-4">
              These buttons simulate API calls that automatically show appropriate toast notifications.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleApiTest('success')}
                disabled={isLoading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : 'Simulate Successful API Call'}
              </button>
              
              <button
                onClick={() => handleApiTest('error')}
                disabled={isLoading}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : 'Simulate Failed API Call'}
              </button>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Use</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 overflow-x-auto">
{`// 1. Use the hook in your component
const toast = useToast();

// 2. Show different types of toasts
toast.showSuccess('Success message');
toast.showError('Error message');
toast.showWarning('Warning message');
toast.showInfo('Info message');

// 3. Custom duration (optional)
toast.showSuccess('Message', 10000); // 10 seconds

// 4. Add ToastContainer to your app
<ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

// 5. For API integration, register the handler
registerToastHandler({
  showSuccess: toast.showSuccess,
  showError: toast.showError,
  showInfo: toast.showInfo,
  showWarning: toast.showWarning,
});`}
              </pre>
            </div>
          </div>

          {/* Current Toasts Counter */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Active toasts: <span className="font-semibold">{toast.toasts.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}