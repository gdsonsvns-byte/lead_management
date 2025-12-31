import { Copy, PenIcon, XIcon } from 'lucide-react'
import React, { Dispatch, SetStateAction } from 'react'
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface Props {
    setOpenTokenModal: Dispatch<SetStateAction<boolean>>;
    apiKey: {
        message: string;
        token: string;
    };
}

export default function ShowApiToken({ setOpenTokenModal, apiKey }: Props) {
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center p-10 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Generate API Key</h2>
                    <button
                        onClick={() => setOpenTokenModal(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="mt-6">
                    <Input
                        type="text"
                        label="API Name"
                        placeholder="Enter API name"
                        leftIcon={<Copy size={18} />}
                        value={apiKey.token}
                        readOnly
                    />
                    <span className="text-xs text-gray-500 mt-2 block">
                        {apiKey.message}
                    </span>
                </div>
                <div className="flex items-center justify-end mt-6">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(apiKey.token)
                            toast.success('Token copied to clipboard!', {
                                duration: 5000
                            });
                        }}
                        className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
                    >
                        Copy Token
                    </button>
                </div>
            </div>
        </section>
    )
}
