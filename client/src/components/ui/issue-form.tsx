import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiUrl } from "@/config/api";
import { Bug, AlertTriangle, Lightbulb, Plus, X } from "lucide-react";

// Issue form schema
const issueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description too long"),
  type: z.enum(["bug", "unfinished", "enhancement", "new"], {
    required_error: "Please select an issue type"
  }),
  location: z.string().min(1, "Location is required").max(100, "Location too long"),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  screenshotUrl: z.string().url().optional().or(z.literal(""))
});

type IssueFormData = z.infer<typeof issueSchema>;

interface IssueFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Get current page location for auto-fill
const getCurrentLocation = (): string => {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // Convert common paths to readable names
  const locationMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/profile': 'Profile Page',
    '/calendar': 'Calendar',
    '/songs': 'Songs',
    '/admin': 'Admin',
    '/onboarding': 'Onboarding',
    '/login': 'Login Page'
  };

  const location = locationMap[path] || path;
  return hash ? `${location} ${hash}` : location;
};

// Type icons
const typeIcons = {
  bug: Bug,
  unfinished: AlertTriangle,
  enhancement: Lightbulb,
  new: Plus
};

// Type colors
const typeColors = {
  bug: "text-red-500",
  unfinished: "text-orange-500",
  enhancement: "text-blue-500",
  new: "text-green-500"
};

export default function IssueForm({ open, onOpenChange, onSuccess }: IssueFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      description: "",
      type: undefined,
      location: getCurrentLocation(),
      priority: "medium",
      screenshotUrl: ""
    }
  });

  const handleSubmit = async (data: IssueFormData) => {
    try {
      setIsSubmitting(true);

      console.log('🐛 Submitting issue:', data);

      const submitData = {
        ...data,
        screenshotUrl: data.screenshotUrl || undefined
      };

      const response = await apiRequest("POST", apiUrl("/issues"), submitData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create issue');
      }

      const result = await response.json();

      console.log('🐛 Issue created:', result);

      toast({
        title: "Issue Reported",
        description: `Your ${data.type} report has been submitted successfully.`,
      });

      // Reset form and close modal
      form.reset({
        title: "",
        description: "",
        type: undefined,
        location: getCurrentLocation(),
        priority: "medium",
        screenshotUrl: ""
      });

      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('🐛 Error creating issue:', error);

      toast({
        title: "Failed to Report Issue",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = form.watch("type");
  const TypeIcon = selectedType ? typeIcons[selectedType] : Bug;
  const typeColor = selectedType ? typeColors[selectedType] : "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 ${typeColor}`} />
            Report Issue
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Issue Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-issue-type">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bug" data-testid="option-bug">
                        <div className="flex items-center gap-2">
                          <Bug className="w-4 h-4 text-red-500" />
                          Bug - Something broken
                        </div>
                      </SelectItem>
                      <SelectItem value="unfinished" data-testid="option-unfinished">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Unfinished - Incomplete feature
                        </div>
                      </SelectItem>
                      <SelectItem value="enhancement" data-testid="option-enhancement">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-500" />
                          Enhancement - Improve existing
                        </div>
                      </SelectItem>
                      <SelectItem value="new" data-testid="option-new">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-green-500" />
                          New Feature - Something new
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Brief summary of the issue"
                      data-testid="input-issue-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Where did you encounter this?"
                      data-testid="input-issue-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="critical" data-testid="option-critical">
                        🚨 Critical - Blocks usage
                      </SelectItem>
                      <SelectItem value="high" data-testid="option-high">
                        ⚠️ High - Important fix needed
                      </SelectItem>
                      <SelectItem value="medium" data-testid="option-medium">
                        🔧 Medium - Should fix soon
                      </SelectItem>
                      <SelectItem value="low" data-testid="option-low">
                        💭 Low - Nice to have
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Detailed description of the issue, steps to reproduce, or feature request details..."
                      className="min-h-[100px]"
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Screenshot URL (Optional) */}
            <FormField
              control={form.control}
              name="screenshotUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Screenshot URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/screenshot.png"
                      data-testid="input-screenshot-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
                data-testid="button-submit-issue"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </div>
                ) : (
                  <>
                    <TypeIcon className="w-4 h-4 mr-2" />
                    Report Issue
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}