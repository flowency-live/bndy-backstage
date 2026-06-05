/**
 * SetlistHeader - Header component with navigation, title, and action buttons
 * Includes undo/redo functionality
 */

interface SetlistHeaderProps {
  setlistName: string;
  drawerOpen: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  onEditName: () => void;
  onSave: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function SetlistHeader({
  setlistName,
  drawerOpen,
  hasUnsavedChanges,
  isSaving,
  canUndo,
  canRedo,
  onBack,
  onEditName,
  onSave,
  onCancel,
  onUndo,
  onRedo,
}: SetlistHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        {/* Hide setlist name on mobile when drawer is open */}
        <h1 className={`text-lg sm:text-2xl font-serif font-bold ${drawerOpen ? 'hidden sm:block' : ''}`}>
          {setlistName}
        </h1>
        <button
          onClick={onEditName}
          className={`text-muted-foreground hover:text-foreground ${drawerOpen ? 'hidden sm:inline-block' : ''}`}
          title="Edit setlist name"
        >
          <i className="fas fa-edit"></i>
        </button>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Undo/Redo buttons */}
        <div className="flex items-center gap-0.5 mr-1 sm:mr-2">
          <button
            onClick={onUndo}
            className="text-muted-foreground hover:text-foreground px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
          >
            <i className="fas fa-undo"></i>
          </button>
          <button
            onClick={onRedo}
            className="text-muted-foreground hover:text-foreground px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
          >
            <i className="fas fa-redo"></i>
          </button>
        </div>
        <button
          onClick={onSave}
          className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save setlist"
          disabled={!hasUnsavedChanges || isSaving}
        >
          <i className="fas fa-save"></i>
          <span className="ml-1 hidden sm:inline">Save</span>
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title="Discard changes"
          disabled={!hasUnsavedChanges || isSaving}
        >
          <i className="fas fa-times"></i>
          <span className="ml-1 hidden sm:inline">Cancel</span>
        </button>
        {isSaving && (
          <span className="text-xs sm:text-sm text-muted-foreground animate-pulse">
            <i className="fas fa-spinner fa-spin"></i>
            <span className="ml-1 hidden sm:inline">Saving...</span>
          </span>
        )}
        {hasUnsavedChanges && !isSaving && (
          <span className="text-xs sm:text-sm text-yellow-600" title="Unsaved changes">
            <i className="fas fa-exclamation-circle"></i>
            <span className="ml-1 hidden sm:inline">Unsaved changes</span>
          </span>
        )}
      </div>
    </div>
  );
}
