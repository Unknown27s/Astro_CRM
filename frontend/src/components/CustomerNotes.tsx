import { useState, useEffect, useCallback } from 'react';
import { notes } from '../services/api';
import toast from 'react-hot-toast';
import {
    MessageSquare,
    Pin,
    Calendar,
    Plus,
    Trash2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Spinner, EmptyState } from './ui/Avatar';
import { Label } from './ui/Label';

const NOTE_TYPES = [
    { value: 'general', label: 'General Note', color: 'bg-neutral-100 text-neutral-700' },
    { value: 'call_log', label: 'Call Log', color: 'bg-blue-100 text-blue-700' },
    { value: 'meeting_notes', label: 'Meeting Note', color: 'bg-purple-100 text-purple-700' },
    { value: 'complaint', label: 'Complaint', color: 'bg-red-100 text-red-700' },
    { value: 'feedback', label: 'Feedback', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'internal', label: 'Internal', color: 'bg-amber-100 text-amber-700' },
];

function getNoteMeta(type: string) {
    return NOTE_TYPES.find(n => n.value === type) || NOTE_TYPES[0];
}

export default function CustomerNotes({ customerId }: { customerId: number }) {
    const [noteList, setNoteList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newNote, setNewNote] = useState({ content: '', note_type: 'general', follow_up_date: '' });

    const fetchCustomerNotes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notes.getByCustomer(customerId, { limit: 50 });
            setNoteList(res.data.notes || []);
        } catch (error) {
            toast.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        fetchCustomerNotes();
    }, [fetchCustomerNotes]);

    const handleAddNote = async () => {
        if (!newNote.content.trim()) {
            toast.error('Note content is required');
            return;
        }
        setAddLoading(true);
        try {
            await notes.create({
                customer_id: customerId,
                content: newNote.content,
                note_type: newNote.note_type,
                follow_up_date: newNote.follow_up_date || null
            });
            setShowAddModal(false);
            setNewNote({ content: '', note_type: 'general', follow_up_date: '' });
            toast.success('Note added');
            await fetchCustomerNotes();
        } catch (error) {
            toast.error('Failed to add note');
        } finally {
            setAddLoading(false);
        }
    };

    const handleTogglePin = async (noteId: number) => {
        try {
            await notes.togglePin(noteId);
            await fetchCustomerNotes();
        } catch {
            toast.error('Failed to pin note');
        }
    };

    const handleDelete = async (noteId: number) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await notes.delete(noteId);
            toast.success('Note deleted');
            await fetchCustomerNotes();
        } catch {
            toast.error('Failed to delete note');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Interaction Notes
                </h3>
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="gap-1 h-8">
                    <Plus size={14} /> Add Note
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : noteList.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {noteList.map(note => {
                        const meta = getNoteMeta(note.note_type);
                        return (
                            <div key={note.id} className={`p-3 rounded-lg border transition-all relative group ${note.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-neutral-200 hover:border-primary-300'}`}>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge className={`text-[10px] px-1.5 py-0 ${meta.color}`}>{meta.label}</Badge>
                                        <span className="text-[10px] text-neutral-500">
                                            {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleTogglePin(note.id)} className={`p-1 rounded ${note.is_pinned ? 'text-amber-500' : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-100'}`}>
                                            <Pin size={14} className={note.is_pinned ? 'fill-current' : ''} />
                                        </button>
                                        <button onClick={() => handleDelete(note.id)} className="p-1 rounded text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-neutral-800 whitespace-pre-wrap">{note.content}</p>
                                {note.follow_up_date && (
                                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                                        <Calendar size={12} /> Follow-up by: {new Date(note.follow_up_date).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState title="No notes recorded yet" description="Add a note to keep track of interactions" />
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Interaction Note"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleAddNote} disabled={addLoading}>
                            {addLoading ? 'Saving...' : 'Save Note'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="note-type">Interaction Type</Label>
                        <select
                            id="note-type"
                            value={newNote.note_type}
                            onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="note-content">Note Content *</Label>
                        <textarea
                            id="note-content"
                            value={newNote.content}
                            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={4}
                            placeholder="What was discussed?"
                        />
                    </div>
                    <div>
                        <Label htmlFor="follow-up">Follow-up Date (Optional)</Label>
                        <input
                            type="date"
                            id="follow-up"
                            value={newNote.follow_up_date}
                            onChange={(e) => setNewNote({ ...newNote, follow_up_date: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
