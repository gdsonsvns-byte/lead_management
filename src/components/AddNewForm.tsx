"use client";
import { X, ClipboardListIcon, PlusIcon } from "lucide-react";
import { Dispatch, useState } from "react";
import Input from "./ui/Input";
import FieldItem from "./FieldItem";
import Spinner from "./ui/spinner";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from 'react-hot-toast';

interface FormField {
  label: string;
  type: string;
  required: boolean;
  options: string[];
  optionsText: string;
}

export default function AddNewForm({ accountId }: { accountId?: string }) {
  const [openFormModal, setOpenFormModal] = useState(false);
  return (
    <div className="relative">
      <button
        className="bg-blue-600 flex items-center gap-5 px-5 py-2.5 text-base text-white rounded-full cursor-pointer"
        onClick={() => setOpenFormModal(true)}
      >
        Add New Form
        <PlusIcon size={14} />
      </button>

      {openFormModal && <OpenForm onClose={setOpenFormModal} accountId={accountId} />}
      <Toaster />
    </div>
  );
}

interface CreateFormPayload {
  title: string;
  description: string;
  adminCampaign?:string;
  userCampaign?:string;
  fields: FormField[];
}
interface Props {
  onClose: Dispatch<React.SetStateAction<boolean>>;
  accountId?: string
}

function OpenForm({ onClose, accountId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [adminCampaign, setAdminCampaign] = useState<string | "">("");
  const [userCampaign, setUserCampaign] = useState<string | "">("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 2000);
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { label: "", type: "text", required: false, options: [], optionsText: "" },
    ]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const CreateForm = useMutation({
    mutationFn: async (payload: CreateFormPayload) => {
      const response = await axios.post(`/api/v1/form?account_id=${accountId ?? ''}`, payload, {
        withCredentials: true,
      });
      return response.data;
    },

    onError: (err: AxiosError<any>) => {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        setFieldErrors(apiErrors);
        showMessage("error", `${err?.response?.data?.error}`);
      } else {
        showMessage("error", `${err?.response?.data?.error}`);
      }
      toast.error(err?.response?.data?.error, {
        duration: 5000
      });
    },

    onSuccess: () => {
      setFieldErrors({});
      toast.success('Form created successfully!', {
        duration: 5000
      });
      showMessage("success", "Form created successfully!");
      setTimeout(() => onClose(false), 800);
    },
  });

  const { mutate, isPending } = CreateForm;

  const saveForm = () => {
    if (!title.trim()) {
      showMessage("error", "Form name is required.");
      return;
    }
    const payload = { title, description, adminCampaign,userCampaign, fields };
    mutate(payload);
  };

  return (
    <section className="fixed inset-0 min-h-screen bg-black/20 z-50 p-8 overflow-y-auto">
      <div className="relative w-full max-w-3xl mx-auto bg-white p-6 rounded-2xl">

        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-800 text-lg">Add New Form</span>

          <button
            className="w-8 h-8 bg-zinc-800 text-white flex items-center justify-center rounded-full"
            onClick={() => onClose(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6">
          <Input
            type="text"
            label="Form Name"
            placeholder="Enter form name"
            leftIcon={<ClipboardListIcon size={18} />}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {fieldErrors.title && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.title[0]}</p>
          )}
        </div>

        <div className="mt-4">
          <Input
            type="text"
            label="Description"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-2">
          <Input
            type="text"
            label="Admin Campaign Name"
            placeholder="Example: admin_new_lead_alert"
            value={adminCampaign}
            onChange={(e) => setAdminCampaign(e.target.value)}
          />
          <Input
            type="text"
            label="User Campaign Name"
            placeholder="Example: user_lead_received"
            value={userCampaign}
            onChange={(e) => setUserCampaign(e.target.value)}
          />
        </div>

        <div className="mt-6">
          <div className="mt-4 space-y-4">
            {fields.map((field, index) => (
              <FieldItem
                key={index}
                index={index}
                field={field}
                updateField={updateField}
                removeField={removeField}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-5">
            <h2 className="font-medium text-zinc-800">Fields</h2>

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-full flex  items-center gap-2"
              onClick={addField}
            >
              Add Field <PlusIcon size={16} />
            </button>
          </div>

          {fields.length === 0 && (
            <p className="text-zinc-500 text-sm mt-3">
              No fields added yet. Click &quot;Add Field&quot; above.
            </p>
          )}
        </div>

        <button
          onClick={saveForm}
          disabled={isPending}
          className="mt-8 bg-green-600 w-full py-3 rounded-xl text-white font-medium flex items-center justify-center"
        >
          {isPending ? <Spinner color="white" /> : "Create Form"}
        </button>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-white ${message.type === "error" ? "bg-red-600" : "bg-green-600"
              }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </section>
  );
}
