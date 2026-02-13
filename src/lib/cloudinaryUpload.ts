import axios from "axios";

const isImage = (file: File) => file.type.startsWith("image/");
const isVideo = (file: File) => file.type.startsWith("video/");

export async function uploadToCloudinary(
    file: File,
    folder: string,
    onProgress?: (percent: number) => void
): Promise<{ secure_url: string; public_id: string }> {

    const signRes = await axios.post("/api/v1/cloudinary/sign", { folder });
    const { signature, timestamp, cloudName, apiKey } = signRes.data;

    let resourceType: "image" | "video" | "raw" = "raw";
    if (isImage(file)) resourceType = "image";
    else if (isVideo(file)) resourceType = "video";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("use_filename", "true");
    formData.append("unique_filename", "false");
    formData.append("tags", "lead-upload,form-file");
    formData.append("context", `alt=${file.name}|caption=Uploaded via form`);

    const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        formData,
        {
            onUploadProgress: (e) => {
                if (!e.total) return;
                const percent = Math.round((e.loaded * 100) / e.total);
                onProgress?.(percent);
            },
        }
    );

    return uploadRes.data;
}
