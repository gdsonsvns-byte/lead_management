"use client";
import { X } from "lucide-react";
import Input from "./ui/Input";

interface FormField {
    id?: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    optionsText?: string;
}
interface Props {
    index: number;
    field: FormField;
    updateField: (index: number, updates: Partial<FormField>) => void;
    removeField: (index: number) => void;
}

export default function FieldItem({ field, index, updateField, removeField }: Props) {
    const inputTypesWithOptions = ["select", "radio", "checkbox"];
    return (
        <div className="relative">
            <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-700">Field #{index + 1}</h3>
                <button onClick={() => removeField(index)} className="bg-blue-600 text-white p-2 rounded-full cursor-pointer">
                    <X size={14} />
                </button>
            </div>

            <div className="relative mt-4">
                <div className="flex gap-4 flex-col md:flex-row">
                    <Input
                        placeholder="Label"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                    />

                    <select
                        className="w-full border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 p-2 rounded"
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value })}
                    >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="radio">Radio</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="file">File Upload</option>
                    </select>
                </div>

                {inputTypesWithOptions.includes(field.type) && (
                    <textarea
                        className="w-full border border-gray-300 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-blue-300 mt-3"
                        placeholder="Options (comma separated)"
                        value={field.optionsText || ""}
                        onChange={(e) => {
                            const text = e.target.value;
                            updateField(index, {
                                optionsText: text,
                                options: text
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                            });
                        }}
                    />
                )}
            </div>
            <label className="flex items-center space-x-2 mt-2 w-max">
                <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                    }
                />
                <span>Required field</span>
            </label>

        </div>
    );
}
