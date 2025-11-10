import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface BasicInfoSectionProps {
  name: string;
  bio: string;
  onNameChange: (name: string) => void;
  onBioChange: (bio: string) => void;
}

export default function BasicInfoSection({
  name,
  bio,
  onNameChange,
  onBioChange
}: BasicInfoSectionProps) {
  return (
    <>
      {/* Name */}
      <div>
        <Label htmlFor="name" className="text-card-foreground font-semibold">Artist Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Your artist or band name"
          required
          className="mt-2"
        />
      </div>

      {/* Bio */}
      <div>
        <Label htmlFor="bio" className="text-card-foreground font-semibold">Bio / Description</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder="Tell people about your music and story..."
          rows={4}
          className="mt-2"
        />
      </div>
    </>
  );
}
