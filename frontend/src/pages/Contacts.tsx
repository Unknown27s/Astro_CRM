import { useEffect, useState } from 'react';
import { contacts } from '../services/api';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

export default function Contacts() {
    const [contactList, setContactList] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [, setShowModal] = useState(false);
    const [, setEditingContact] = useState<any>(null);

    useEffect(() => {
        loadContacts();
    }, [search]);

    const loadContacts = async () => {
        try {
            const response = await contacts.getAll({ search });
            setContactList(response.data.contacts);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this contact?')) {
            try {
                await contacts.delete(id);
                loadContacts();
            } catch (error) {
                console.error('Error deleting contact:', error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Contacts</h1>
                    <p className="text-gray-600 mt-1">Manage your customer relationships</p>
                </div>
                <button
                    onClick={() => {
                        setEditingContact(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    Add Contact
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center gap-2">
                    <Search className="text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 outline-none"
                    />
                </div>
            </div>

            {/* Contacts Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Company
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {contactList.map((contact) => (
                            <tr key={contact.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">
                                        {contact.first_name} {contact.last_name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                    {contact.email || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                    {contact.company || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                    {contact.phone || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 text-xs rounded-full ${contact.status === 'Active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {contact.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button
                                        onClick={() => {
                                            setEditingContact(contact);
                                            setShowModal(true);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 mr-3"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(contact.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {contactList.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    No contacts found. Add your first contact to get started!
                </div>
            )}
        </div>
    );
}
