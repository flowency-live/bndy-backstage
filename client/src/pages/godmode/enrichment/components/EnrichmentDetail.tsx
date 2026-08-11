// Expanded row detail for reviewing enrichment suggestions

import { useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { EnrichmentQueueItem } from '../../lib/queries';
import ConfidenceBadge from './ConfidenceBadge';

interface EnrichmentDetailProps {
  item: EnrichmentQueueItem;
  onAccept: (fields?: string[]) => void;
  onReject: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
}

type FieldKey = string;

interface FieldComparison {
  key: FieldKey;
  label: string;
  current: string | null;
  suggested: string | null;
}

function getFieldComparisons(item: EnrichmentQueueItem): FieldComparison[] {
  const comparisons: FieldComparison[] = [];

  if (item.type === 'artist') {
    const data = item.enrichmentData;
    if (!data) return [];

    if (data.suggested_facebookUrl !== undefined) {
      comparisons.push({
        key: 'facebookUrl',
        label: 'Facebook URL',
        current: item.facebookUrl || null,
        suggested: data.suggested_facebookUrl,
      });
    }
    if (data.suggested_websiteUrl !== undefined) {
      comparisons.push({
        key: 'websiteUrl',
        label: 'Website URL',
        current: item.websiteUrl || null,
        suggested: data.suggested_websiteUrl,
      });
    }
    if (data.suggested_bio !== undefined) {
      comparisons.push({
        key: 'bio',
        label: 'Bio',
        current: item.bio || null,
        suggested: data.suggested_bio,
      });
    }
  } else {
    const data = item.enrichment_data;
    if (!data) return [];

    if (data.suggested_website !== undefined) {
      comparisons.push({
        key: 'website',
        label: 'Website',
        current: item.website || null,
        suggested: data.suggested_website,
      });
    }
    if (data.suggested_facebook !== undefined) {
      comparisons.push({
        key: 'facebookUrl',
        label: 'Facebook URL',
        current: item.facebookUrl || null,
        suggested: data.suggested_facebook,
      });
    }
  }

  return comparisons;
}

function getNotes(item: EnrichmentQueueItem): string | undefined {
  if (item.type === 'artist') {
    return item.enrichmentData?.notes;
  }
  return item.enrichment_data?.notes;
}

function getEvidenceUrls(item: EnrichmentQueueItem): string[] {
  if (item.type === 'artist') {
    return item.enrichmentData?.evidenceUrls ?? [];
  }
  return [];
}

function getConfidence(item: EnrichmentQueueItem): 'HIGH' | 'MEDIUM' | 'LOW' | undefined {
  if (item.type === 'artist') {
    return item.enrichmentData?.confidence;
  }
  return item.enrichment_data?.confidence;
}

export default function EnrichmentDetail({
  item,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: EnrichmentDetailProps) {
  const comparisons = getFieldComparisons(item);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(comparisons.map((c) => c.key)),
  );

  const notes = getNotes(item);
  const evidenceUrls = getEvidenceUrls(item);
  const confidence = getConfidence(item);

  const toggleField = (key: string) => {
    const next = new Set(selectedFields);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedFields(next);
  };

  const handleAcceptSelected = () => {
    onAccept(Array.from(selectedFields));
  };

  const handleAcceptAll = () => {
    onAccept();
  };

  return (
    <div className="bg-muted/30 border-t p-4 space-y-4">
      {/* Metadata row */}
      <div className="flex items-center gap-4 text-sm">
        {confidence && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Confidence:</span>
            <ConfidenceBadge confidence={confidence} />
          </div>
        )}
        {notes && (
          <div className="flex-1 text-muted-foreground">
            <span className="font-medium">Notes:</span> {notes}
          </div>
        )}
      </div>

      {/* Evidence URLs */}
      {evidenceUrls.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Evidence:</span>
          {evidenceUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {new URL(url).hostname}
            </a>
          ))}
        </div>
      )}

      {/* Field comparison table */}
      <div className="rounded border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-medium w-8"></th>
              <th className="px-3 py-2 text-left font-medium w-32">Field</th>
              <th className="px-3 py-2 text-left font-medium">Current Value</th>
              <th className="px-3 py-2 text-left font-medium">Suggested Value</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comp) => (
              <tr key={comp.key} className="border-t">
                <td className="px-3 py-2">
                  <Checkbox
                    id={`field-${comp.key}`}
                    checked={selectedFields.has(comp.key)}
                    onCheckedChange={() => toggleField(comp.key)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Label htmlFor={`field-${comp.key}`} className="cursor-pointer">
                    {comp.label}
                  </Label>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {comp.current ? (
                    comp.current.length > 60 ? (
                      <span title={comp.current}>{comp.current.slice(0, 60)}...</span>
                    ) : (
                      comp.current
                    )
                  ) : (
                    <span className="italic">Empty</span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium text-green-700">
                  {comp.suggested ? (
                    comp.suggested.length > 60 ? (
                      <span title={comp.suggested}>{comp.suggested.slice(0, 60)}...</span>
                    ) : (
                      comp.suggested
                    )
                  ) : (
                    <span className="italic text-muted-foreground">Clear field</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={isRejecting || isAccepting}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <X className="h-4 w-4 mr-1" />
          Reject All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAcceptSelected}
          disabled={isAccepting || isRejecting || selectedFields.size === 0}
        >
          <Check className="h-4 w-4 mr-1" />
          Accept Selected ({selectedFields.size})
        </Button>
        <Button
          size="sm"
          onClick={handleAcceptAll}
          disabled={isAccepting || isRejecting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="h-4 w-4 mr-1" />
          Accept All
        </Button>
      </div>
    </div>
  );
}
