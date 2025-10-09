import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { 
  Wrench, 
  HardDrive, 
  Zap, 
  Eye, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Shield,
  Cpu,
  Trash2,
  Settings,
  FileSearch,
  Edit3
} from 'lucide-react';

interface ManualActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActivityTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  action: string;
  resourceType: string;
  severity: string;
  defaultDetails: Record<string, any>;
}

const activityTemplates: ActivityTemplate[] = [
  {
    id: 'server-maintenance',
    title: 'Server Maintenance',
    description: 'Routine maintenance or servicing',
    icon: Wrench,
    category: 'maintenance',
    action: 'MAINTENANCE',
    resourceType: 'server',
    severity: 'info',
    defaultDetails: {
      maintenanceType: 'routine',
      duration: '',
      components: []
    }
  },
  {
    id: 'disk-replacement',
    title: 'Disk Replacement',
    description: 'Hard drive or SSD replacement',
    icon: HardDrive,
    category: 'maintenance',
    action: 'COMPONENT_REPLACEMENT',
    resourceType: 'server',
    severity: 'warning',
    defaultDetails: {
      component: 'disk',
      oldSerial: '',
      newSerial: '',
      capacity: ''
    }
  },
  {
    id: 'psu-replacement',
    title: 'PSU Replacement',
    description: 'Power supply unit replacement',
    icon: Zap,
    category: 'maintenance',
    action: 'COMPONENT_REPLACEMENT',
    resourceType: 'server',
    severity: 'warning',
    defaultDetails: {
      component: 'psu',
      oldSerial: '',
      newSerial: '',
      wattage: ''
    }
  },
  {
    id: 'motherboard-replacement',
    title: 'Motherboard Replacement',
    description: 'Replace or upgrade motherboard',
    icon: Cpu,
    category: 'maintenance',
    action: 'COMPONENT_REPLACEMENT',
    resourceType: 'server',
    severity: 'critical',
    defaultDetails: {
      component: 'motherboard',
      oldModel: '',
      newModel: '',
      chipset: '',
      bios: ''
    }
  },
  {
    id: 'memory-upgrade',
    title: 'Memory Upgrade',
    description: 'RAM installation or replacement',
    icon: Settings,
    category: 'maintenance',
    action: 'COMPONENT_REPLACEMENT',
    resourceType: 'server',
    severity: 'info',
    defaultDetails: {
      component: 'memory',
      oldCapacity: '',
      newCapacity: '',
      memoryType: '',
      slots: ''
    }
  },
  {
    id: 'dismantle-server',
    title: 'Dismantle Server',
    description: 'Server decommissioning and removal',
    icon: Trash2,
    category: 'lifecycle',
    action: 'DECOMMISSION',
    resourceType: 'server',
    severity: 'critical',
    defaultDetails: {
      reason: '',
      dataWiped: '',
      componentsRecovered: '',
      disposalMethod: '',
      witness: ''
    }
  },
  {
    id: 'audit-check',
    title: 'Audit Check',
    description: 'Compliance or inventory audit',
    icon: FileSearch,
    category: 'audit',
    action: 'AUDIT',
    resourceType: 'server',
    severity: 'info',
    defaultDetails: {
      auditType: 'compliance',
      auditor: '',
      findings: '',
      compliance: 'pass',
      recommendations: ''
    }
  },
  {
    id: 'security-audit',
    title: 'Security Audit',
    description: 'Security compliance verification',
    icon: Shield,
    category: 'audit',
    action: 'SECURITY_AUDIT',
    resourceType: 'server',
    severity: 'warning',
    defaultDetails: {
      securityLevel: '',
      vulnerabilities: '',
      patches: '',
      accessReview: '',
      certifications: ''
    }
  },
  {
    id: 'site-visit',
    title: 'Site Visit',
    description: 'Physical site inspection or visit',
    icon: Eye,
    category: 'inspection',
    action: 'SITE_VISIT',
    resourceType: 'datacenter',
    severity: 'info',
    defaultDetails: {
      visitType: 'inspection',
      findings: '',
      recommendations: ''
    }
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Investigation and problem resolution',
    icon: AlertTriangle,
    category: 'support',
    action: 'TROUBLESHOOTING',
    resourceType: 'server',
    severity: 'warning',
    defaultDetails: {
      issue: '',
      symptoms: '',
      resolution: '',
      rootCause: ''
    }
  },
  {
    id: 'health-check',
    title: 'Health Check',
    description: 'System health verification',
    icon: CheckCircle,
    category: 'inspection',
    action: 'HEALTH_CHECK',
    resourceType: 'server',
    severity: 'info',
    defaultDetails: {
      checkType: 'routine',
      status: 'healthy',
      issues: []
    }
  },
  {
    id: 'custom-activity',
    title: 'Other Activity',
    description: 'Custom activity or task',
    icon: Edit3,
    category: 'other',
    action: 'CUSTOM',
    resourceType: 'server',
    severity: 'info',
    defaultDetails: {
      activityType: '',
      category: '',
      description: '',
      outcome: '',
      duration: ''
    }
  }
];

export const ManualActivityDialog: React.FC<ManualActivityDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplate | null>(null);
  const [formData, setFormData] = useState({
    resourceId: '',
    resourceName: '',
    notes: '',
    customDetails: {} as Record<string, string>
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  const handleTemplateSelect = (template: ActivityTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      resourceId: '',
      resourceName: '',
      notes: '',
      customDetails: Object.keys(template.defaultDetails).reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>)
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'resourceId' || field === 'resourceName' || field === 'notes') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        customDetails: { ...prev.customDetails, [field]: value }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    // Validation for server-related activities
    if (!formData.resourceId && selectedTemplate.resourceType === 'server') {
      toast({
        title: 'Error',
        description: 'Please specify a server ID or hostname',
        variant: 'destructive'
      });
      return;
    }

    // Additional validation for custom activities
    if (selectedTemplate.id === 'custom-activity') {
      if (!formData.customDetails.activityType || !formData.customDetails.description) {
        toast({
          title: 'Error',
          description: 'Please provide both Activity Type and Description for custom activities',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const activityDetails = {
        ...selectedTemplate.defaultDetails,
        ...formData.customDetails,
        notes: formData.notes,
        resourceName: formData.resourceName,
        timestamp: new Date().toISOString(),
        manualEntry: true
      };

      await logActivity({
        category: selectedTemplate.category,
        action: selectedTemplate.action,
        resourceType: selectedTemplate.resourceType,
        resourceId: formData.resourceId || undefined,
        details: activityDetails,
        severity: selectedTemplate.severity,
        tags: ['manual', selectedTemplate.id],
        metadata: {
          template: selectedTemplate.title,
          entryMethod: 'manual_dialog'
        }
      });

      toast({
        title: 'Activity Logged',
        description: `${selectedTemplate.title} has been recorded successfully`,
      });

      // Reset form and close dialog
      setSelectedTemplate(null);
      setFormData({
        resourceId: '',
        resourceName: '',
        notes: '',
        customDetails: {}
      });
      onOpenChange(false);

    } catch (error) {
      console.error('Failed to log activity:', error);
      toast({
        title: 'Error Logging Activity',
        description: error instanceof Error ? error.message : 'Failed to log activity. Please check your connection and try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedTemplate(null);
    setFormData({
      resourceId: '',
      resourceName: '',
      notes: '',
      customDetails: {}
    });
    onOpenChange(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Log Manual Activity</span>
          </DialogTitle>
          <DialogDescription>
            Record maintenance activities, site visits, troubleshooting, and other manual operations
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-slate-700">Select Activity Type</h3>
            
            {/* Hardware Maintenance */}
            <div>
              <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Hardware Maintenance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activityTemplates.filter(t => t.category === 'maintenance').map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-slate-50"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <template.icon className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-sm">{template.title}</span>
                      <Badge variant="outline" className={`ml-auto text-xs ${getSeverityColor(template.severity)}`}>
                        {template.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 text-left">{template.description}</p>
                  </Button>
                ))}
              </div>
            </div>

            {/* Audit & Compliance */}
            <div>
              <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Audit & Compliance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activityTemplates.filter(t => t.category === 'audit').map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-slate-50"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <template.icon className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-sm">{template.title}</span>
                      <Badge variant="outline" className={`ml-auto text-xs ${getSeverityColor(template.severity)}`}>
                        {template.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 text-left">{template.description}</p>
                  </Button>
                ))}
              </div>
            </div>

            {/* Server Lifecycle */}
            <div>
              <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Server Lifecycle</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activityTemplates.filter(t => t.category === 'lifecycle').map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-slate-50"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <template.icon className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-sm">{template.title}</span>
                      <Badge variant="outline" className={`ml-auto text-xs ${getSeverityColor(template.severity)}`}>
                        {template.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 text-left">{template.description}</p>
                  </Button>
                ))}
              </div>
            </div>

            {/* Operations & Support */}
            <div>
              <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Operations & Support</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activityTemplates.filter(t => ['inspection', 'support'].includes(t.category)).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-slate-50"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <template.icon className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-sm">{template.title}</span>
                      <Badge variant="outline" className={`ml-auto text-xs ${getSeverityColor(template.severity)}`}>
                        {template.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 text-left">{template.description}</p>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom/Other Activities */}
            <div>
              <h4 className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">Custom Activities</h4>
              <div className="grid grid-cols-1 gap-3">
                {activityTemplates.filter(t => t.category === 'other').map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-blue-50 border-blue-200"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <template.icon className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-sm text-blue-900">{template.title}</span>
                      <Badge variant="outline" className={`ml-auto text-xs bg-blue-50 text-blue-700 border-blue-200`}>
                        flexible
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-600 text-left">{template.description}</p>
                    <p className="text-xs text-blue-500 text-left italic">For activities not covered by other templates</p>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Template Header */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <selectedTemplate.icon className="h-5 w-5 text-slate-600" />
                <span className="font-medium">{selectedTemplate.title}</span>
                <Badge variant="outline" className={`text-xs ${getSeverityColor(selectedTemplate.severity)}`}>
                  {selectedTemplate.severity}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                Change Type
              </Button>
            </div>

            {/* Resource Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resourceId">
                  {selectedTemplate.resourceType === 'server' ? 'Server ID/Hostname' : 'Resource ID'} *
                </Label>
                <Input
                  id="resourceId"
                  value={formData.resourceId}
                  onChange={(e) => handleInputChange('resourceId', e.target.value)}
                  placeholder={selectedTemplate.resourceType === 'server' ? 'e.g., server-01 or hostname' : 'Resource identifier'}
                />
              </div>
              <div>
                <Label htmlFor="resourceName">Resource Name (Optional)</Label>
                <Input
                  id="resourceName"
                  value={formData.resourceName}
                  onChange={(e) => handleInputChange('resourceName', e.target.value)}
                  placeholder="Friendly name or description"
                />
              </div>
            </div>

            {/* Template-specific Fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700">Activity Details</h4>
              
              {selectedTemplate.id === 'custom-activity' ? (
                /* Custom Activity Fields */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="activityType">Activity Type *</Label>
                      <Input
                        id="activityType"
                        value={formData.customDetails.activityType || ''}
                        onChange={(e) => handleInputChange('activityType', e.target.value)}
                        placeholder="e.g., Cable Management, Firmware Update, etc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.customDetails.category || ''}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        placeholder="e.g., Network, Security, Hardware, etc."
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Activity Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.customDetails.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what was done, tools used, procedures followed..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="outcome">Outcome/Result</Label>
                      <Input
                        id="outcome"
                        value={formData.customDetails.outcome || ''}
                        onChange={(e) => handleInputChange('outcome', e.target.value)}
                        placeholder="e.g., Successful, Failed, Partial"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={formData.customDetails.duration || ''}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        placeholder="e.g., 2 hours, 30 minutes"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Template Fields */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(selectedTemplate.defaultDetails).map((field) => (
                    <div key={field}>
                      <Label htmlFor={field} className="capitalize">
                        {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <Input
                        id={field}
                        value={formData.customDetails[field] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional details, observations, or comments..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Logging...' : 'Log Activity'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
