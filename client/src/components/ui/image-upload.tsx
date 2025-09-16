import { useState, useRef } from "react";
import { Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
}

export default function ImageUpload({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Upload image",
  size = "md"
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  };

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      });
      return false;
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      // Convert file to base64 for now - could be enhanced with proper upload service later
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange(result);
        setUploading(false);
        toast({
          title: "Image uploaded",
          description: "Your image has been uploaded successfully",
        });
      };
      reader.onerror = () => {
        setUploading(false);
        toast({
          title: "Upload failed",
          description: "Failed to read the image file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the image",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || uploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div 
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors cursor-pointer",
        dragOver && !disabled && !uploading && "border-primary bg-primary/5",
        value && "border-solid border-border",
        disabled && "opacity-50 cursor-not-allowed",
        !value && "border-border hover:border-primary/50",
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid="image-upload-container"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
        data-testid="image-upload-input"
      />

      {value ? (
        <>
          <img
            src={value}
            alt="Uploaded image"
            className="w-full h-full object-cover rounded-lg"
            data-testid="image-preview"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
              onClick={handleRemove}
              data-testid="button-remove-image"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="text-xs text-center">Uploading...</span>
            </>
          ) : (
            <>
              <div className="p-2 rounded-full bg-muted/50">
                {dragOver ? <Upload className="w-4 h-4" /> : <Image className="w-4 h-4" />}
              </div>
              <span className="text-xs text-center px-2">
                {dragOver ? "Drop image here" : placeholder}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}