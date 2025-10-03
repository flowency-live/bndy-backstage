import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { issuesService, type Issue, type IssuesResponse } from "@/lib/services/issues-service";
import IssueForm from "@/components/ui/issue-form";
import {
  Bug,
  AlertTriangle,
  Lightbulb,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// Issue type configuration
const issueTypeConfig = {
  bug: { icon: Bug, label: "Bug", color: "bg-red-100 text-red-800 border-red-200" },
  unfinished: { icon: AlertTriangle, label: "Unfinished", color: "bg-orange-100 text-orange-800 border-orange-200" },
  enhancement: { icon: Lightbulb, label: "Enhancement", color: "bg-blue-100 text-blue-800 border-blue-200" },
  new: { icon: Plus, label: "New Feature", color: "bg-green-100 text-green-800 border-green-200" }
};

const priorityConfig = {
  critical: { label: "🚨 Critical", color: "bg-red-100 text-red-800 border-red-200" },
  high: { label: "⚠️ High", color: "bg-orange-100 text-orange-800 border-orange-200" },
  medium: { label: "🔧 Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  low: { label: "💭 Low", color: "bg-gray-100 text-gray-800 border-gray-200" }
};

const statusConfig = {
  open: { icon: AlertCircle, label: "Open", color: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { icon: Clock, label: "In Progress", color: "bg-orange-100 text-orange-800 border-orange-200" },
  resolved: { icon: CheckCircle2, label: "Resolved", color: "bg-green-100 text-green-800 border-green-200" },
  closed: { icon: RefreshCw, label: "Closed", color: "bg-gray-100 text-gray-800 border-gray-200" }
};

export default function Issues() {
  const { toast } = useToast();
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    priority: "",
    status: ""
  });

  // Fetch issues
  const { data: issuesData, isLoading, error, refetch } = useQuery<IssuesResponse>({
    queryKey: ["issues", filters],
    queryFn: () => issuesService.getIssues(filters)
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, updates }: { issueId: string; updates: Partial<Issue> }) => {
      return issuesService.updateIssue(issueId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast({
        title: "Issue Updated",
        description: "Issue has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async (updates: Partial<Issue>) => {
      return issuesService.batchUpdateIssues({
        issueIds: selectedIssues,
        updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setSelectedIssues([]);
      toast({
        title: "Issues Updated",
        description: `${selectedIssues.length} issues updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Batch Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete issue mutation
  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      return issuesService.deleteIssue(issueId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast({
        title: "Issue Deleted",
        description: "Issue has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filter issues by search term and filters
  const filteredIssues = issuesData?.issues?.filter(issue => {
    // Search filter
    const matchesSearch = filters.search === "" ||
      issue.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      issue.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      issue.location.toLowerCase().includes(filters.search.toLowerCase());

    // Type filter
    const matchesType = filters.type === "" || filters.type === "all" || issue.type === filters.type;

    // Priority filter
    const matchesPriority = filters.priority === "" || filters.priority === "all" || issue.priority === filters.priority;

    // Status filter
    const matchesStatus = filters.status === "" || filters.status === "all" || issue.status === filters.status;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  }) || [];

  // Handle issue selection
  const handleIssueSelection = (issueId: string, checked: boolean) => {
    setSelectedIssues(prev =>
      checked
        ? [...prev, issueId]
        : prev.filter(id => id !== issueId)
    );
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    setSelectedIssues(checked ? filteredIssues.map(issue => issue.issue_id) : []);
  };

  // Quick update status
  const handleStatusUpdate = (issueId: string, status: Issue["status"]) => {
    updateIssueMutation.mutate({ issueId, updates: { status } });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Issues</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "Something went wrong"}
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-muted-foreground">
            Track bugs, features, and improvements
          </p>
        </div>
        <Button
          onClick={() => setIsIssueFormOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="unfinished">⚠️ Unfinished</SelectItem>
                <SelectItem value="enhancement">💡 Enhancement</SelectItem>
                <SelectItem value="new">✨ New Feature</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">🚨 Critical</SelectItem>
                <SelectItem value="high">⚠️ High</SelectItem>
                <SelectItem value="medium">🔧 Medium</SelectItem>
                <SelectItem value="low">💭 Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">🆕 New</SelectItem>
                <SelectItem value="in-progress">🔄 In Progress</SelectItem>
                <SelectItem value="resolved">✅ Resolved</SelectItem>
                <SelectItem value="wont-fix">❌ Won't Fix</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={() => setFilters({ search: "", type: "all", priority: "all", status: "all" })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {selectedIssues.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedIssues.length} issue(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateMutation.mutate({ status: "in-progress" })}
                  disabled={batchUpdateMutation.isPending}
                >
                  Mark In Progress
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateMutation.mutate({ status: "resolved" })}
                  disabled={batchUpdateMutation.isPending}
                >
                  Mark Resolved
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIssues([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading issues...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Bug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                <p className="text-muted-foreground mb-4">
                  {filters.search || (filters.type !== "" && filters.type !== "all") || (filters.priority !== "" && filters.priority !== "all") || (filters.status !== "" && filters.status !== "all")
                    ? "Try adjusting your filters"
                    : "No issues have been reported yet"}
                </p>
                <Button onClick={() => setIsIssueFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Report First Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                checked={selectedIssues.length === filteredIssues.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all {filteredIssues.length} issue(s)
              </span>
            </div>

            {/* Issues */}
            {filteredIssues.map((issue) => {
              const typeConfig = issueTypeConfig[issue.type];
              const TypeIcon = typeConfig.icon;
              const statusInfo = statusConfig[issue.status];
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={issue.issue_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedIssues.includes(issue.issue_id)}
                        onCheckedChange={(checked) => handleIssueSelection(issue.issue_id, checked as boolean)}
                        className="mt-1"
                      />

                      {/* Issue Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={typeConfig.color}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                            <Badge variant="outline" className={priorityConfig[issue.priority].color}>
                              {priorityConfig[issue.priority].label}
                            </Badge>
                            <Badge variant="outline" className={statusInfo.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusUpdate(issue.issue_id, "in-progress")}>
                                <Clock className="w-4 h-4 mr-2" />
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(issue.issue_id, "resolved")}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteIssueMutation.mutate(issue.issue_id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="text-lg font-semibold mb-2">{issue.title}</h3>
                        <p className="text-muted-foreground mb-3 line-clamp-2">{issue.description}</p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {issue.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(issue.created_at)}
                          </div>
                          {issue.screenshot_url && (
                            <a
                              href={issue.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Screenshot
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Issue Form Modal */}
      <IssueForm
        open={isIssueFormOpen}
        onOpenChange={setIsIssueFormOpen}
        onSuccess={() => {
          refetch();
          toast({
            title: "Issue Reported",
            description: "Thank you for helping improve the platform!",
          });
        }}
      />
    </div>
  );
}