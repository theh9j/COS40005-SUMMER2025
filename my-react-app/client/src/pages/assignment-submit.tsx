import { useParams } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DiscussionThread from "@/components/discussion/DiscussionThread";

type Uploaded = { name: string; url: string; type: string };

export default function AssignmentSubmitPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);
  const [note, setNote] = useState("");

  const onUpload = async () => {
    const ups: Uploaded[] = Array.from(files).map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      url: URL.createObjectURL(f), // mock; BE sẽ thay bằng URL thật
    }));
    setUploaded(ups);
    setFiles([]);
  };

  const onSubmit = async () => {
    // TODO: POST -> /api/assignments/:id/submissions { files, notes }
    alert("Submitted (mock). Wire to backend later.");
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submit Assignment</h1>
          <p className="text-sm text-muted-foreground">ID: {assignmentId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onUpload} disabled={files.length === 0}>Upload selected</Button>
          <Button onClick={onSubmit}>Submit</Button>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Files</label>
              <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              {files.length > 0 && (
                <ul className="mt-2 text-sm list-disc pl-5">
                  {files.map((f, i) => <li key={i}>{f.name}</li>)}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full border rounded-md p-3 min-h-[100px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Điểm bạn muốn GV chú ý…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold">Discussion</h3>
            {/* Discussion theo assignment; sau này đổi thành submissionId/annotationDocId */}
            <DiscussionThread imageId={`assign-${assignmentId}`} />
          </CardContent>
        </Card>
      </section>

      {uploaded.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Your uploaded files (mock)</h3>
          <div className="border rounded-lg p-4">
            <ul className="text-sm list-disc pl-5">
              {uploaded.map((u) => (
                <li key={u.url}><a className="underline" href={u.url} target="_blank" rel="noreferrer">{u.name}</a></li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
