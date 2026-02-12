import axios from "axios";

export async function uploadToCloudinary(
    file: File,
    folder: string,
    onProgress?: (percent: number) => void
): Promise<{ secure_url: string; public_id: string }> {

    const signRes = await axios.post("/api/v1/cloudinary/sign", {
        folder,
    });

    const { signature, timestamp, cloudName, apiKey } = signRes.data;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);

    const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (e) => {
                if (!e.total) return;
                const percent = Math.round((e.loaded * 100) / e.total);
                onProgress?.(percent);
            },
        }
    );

    return uploadRes.data;
}
