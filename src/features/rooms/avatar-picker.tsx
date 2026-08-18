"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { compressImage } from "@/lib/utils/image-compression";

type AvatarPickerProps = {
  value?: string;
  onChange: (photoUrl?: string) => void;
  name?: string;
};

export function AvatarPicker({ value, onChange, name }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || "?";

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setIsCompressing(true);

    try {
      const compressedDataUrl = await compressImage(file, 160, 0.8);
      onChange(compressedDataUrl);
      toast.success("Profile picture updated.");
    } catch {
      toast.error("Unable to process image. Please try another photo.");
    } finally {
      setIsCompressing(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="group relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isCompressing}
          className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-gradient-to-br from-neutral-300 to-neutral-800 text-3xl font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.15)] transition-all hover:border-white hover:shadow-[0_0_32px_rgba(255,255,255,0.3)] focus:outline-none"
          title="Click to select profile picture"
        >
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={value}
              alt="Profile preview"
              className="size-full object-cover"
            />
          ) : (
            <span className="text-white drop-shadow-sm">{initial}</span>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-7 text-white" aria-hidden="true" />
          </div>

          {isCompressing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs font-semibold text-white">
              Processing...
            </div>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border border-white/40 bg-neutral-900 text-white shadow-md transition-transform hover:scale-110"
          title="Upload photo"
        >
          <Camera className="size-4" aria-hidden="true" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium text-white/80 underline-offset-4 hover:underline"
        >
          {value ? "Change photo" : "Upload photo"}
        </button>

        {value ? (
          <>
            <span className="text-white/30">•</span>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="flex items-center gap-1 text-xs font-medium text-red-400/90 underline-offset-4 hover:text-red-300 hover:underline"
            >
              <Trash2 className="size-3" aria-hidden="true" />
              Remove
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
