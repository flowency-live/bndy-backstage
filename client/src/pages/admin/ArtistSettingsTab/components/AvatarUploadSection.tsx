import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ui/image-upload';

interface AvatarUploadSectionProps {
  avatar: string | null;
  onAvatarChange: (url: string) => void;
}

export default function AvatarUploadSection({ avatar, onAvatarChange }: AvatarUploadSectionProps) {
  return (
    <div>
      <Label className="text-card-foreground font-semibold mb-3 block">Profile Image</Label>
      <ImageUpload
        value={avatar || undefined}
        onChange={onAvatarChange}
        size="lg"
      />
    </div>
  );
}
