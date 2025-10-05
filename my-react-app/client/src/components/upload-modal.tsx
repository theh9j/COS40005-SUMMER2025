import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, FileText, CheckCircle, X } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadFile {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: "uploading" | "completed" | "error";
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([
    {
      id: "1",
      name: "brain_mri_001.dcm",
      size: "2.4 MB",
      progress: 100,
      status: "completed",
    },
    {
      id: "2", 
      name: "chest_xray_002.dcm",
      size: "1.8 MB",
      progress: 65,
      status: "uploading",
    },
  ]);

  const handleBrowseFiles = () => {
    // Mock file selection
    console.log("Browse files clicked");
  };

  const handleUpload = () => {
    // Mock upload process
    console.log("Upload started");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl" data-testid="upload-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Upload Medical Images</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drop Zone */}
          <div 
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
            onClick={handleBrowseFiles}
            data-testid="drop-zone"
          >
            <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drag and drop DICOM files here</h3>
            <p className="text-muted-foreground mb-4">or click to browse files</p>
            <Button 
              className="bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-browse-files"
            >
              Browse Files
            </Button>
          </div>

          {/* File List */}
          <div className="space-y-4">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                data-testid={`file-${file.id}`}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{file.size}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {file.status === "uploading" && (
                    <>
                      <div className="w-32">
                        <Progress value={file.progress} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground">{file.progress}%</span>
                    </>
                  )}
                  {file.status === "completed" && (
                    <>
                      <div className="w-32">
                        <Progress value={100} className="h-2" />
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button 
              variant="secondary"
              onClick={onClose}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              className="bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-upload-files"
            >
              Upload Files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
