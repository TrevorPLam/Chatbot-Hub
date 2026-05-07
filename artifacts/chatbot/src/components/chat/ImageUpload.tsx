import React, { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  onImageCleared: () => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelected, onImageCleared, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setPreview(dataUrl);
      onImageSelected(base64, mimeType);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleClear = () => {
    setPreview(null);
    onImageCleared();
  };

  if (preview) {
    return (
      <div className="relative inline-flex">
        <img
          src={preview}
          alt="Attached image"
          className="h-10 w-10 object-cover rounded-lg border border-border"
        />
        <button
          type="button"
          onClick={handleClear}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Attach image"
        className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
    </>
  );
}
