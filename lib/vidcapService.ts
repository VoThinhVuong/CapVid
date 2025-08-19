import { kv } from "@vercel/kv";

export const getVideoPath = async (videoFile: File): Promise<any> => {
  const urlResponse = await fetch("/api/caption", { method: "GET" });
  const urlData = await urlResponse.json();
  const backendUrl = urlData.url;
  if (!backendUrl) {
    throw new Error("Backend URL is not set.");
  }

  alert( backendUrl);

  const formData = new FormData();
  formData.append("file", videoFile);
  try {
  // make a fetch based on the following example
  // curl -X 'POST' \
  // 'https://80e2b4dbf069.ngrok-free.app/upload' \
  // -H 'accept: application/json' \
  // -H 'Content-Type: multipart/form-data' \
  // -F 'file=@lifting.mp4;type=video/mp4'


  const response = await fetch(`${backendUrl}/upload`, {
    method: "POST",
    headers: {
      "accept": "application/json"
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error fetching caption: ${response.statusText}`);
  }
  const data = await response.json();
  return data['path'];

  //return backendUrl;
} catch (error) {
  console.error("Error in getVideoCaption:", error);
  throw error;
}
}

export const getImageProcess = async (path: string): Promise<any> => {

  const urlResponse = await fetch("/api/caption", { method: "GET" });
  const urlData = await urlResponse.json();
  const backendUrl = urlData.url;
  if (!backendUrl) {
    throw new Error("Backend URL is not set.");
  }

  try {
    // Example: send video file to backendUrl
    const response = await fetch(`${backendUrl}/image_process?video_path=${path}`, {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`Error fetching caption: ${response.statusText}`);
    }
    const data = await response.json();
    return data['result'];

    //return backendUrl;
  } catch (error) {
    console.error("Error in getVideoCaption:", error);
    throw error;
  }
}


export const getVideoProcess = async (path: string): Promise<string> => {
  const urlResponse = await fetch("/api/caption", { method: "GET" });
  const urlData = await urlResponse.json();
  const backendUrl = urlData.url;
  if (!backendUrl) {
    throw new Error("Backend URL is not set.");
  }
  if (!backendUrl) {
    throw new Error("Backend URL is not set.");
  }


  try {
    // Example: send video file to backendUrl/context
    const response = await fetch(`${backendUrl}/video_process?video_path=${path}`, {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`Error fetching video context: ${response.statusText}`);
    }
    const data = await response.json();
    return data['video_motion'];
    //return backendUrl;
  } catch (error) {
    console.error("Error in getVideoContext:", error);
    throw error;
  }
}

export const getImageCaption = async (imageFile: File): Promise<string> => {
  const urlResponse = await fetch("/api/caption", { method: "GET" });
  const urlData = await urlResponse.json();
  const backendUrl = urlData.url;
  if (!backendUrl) {
    throw new Error("Backend URL is not set.");
  }

  const formData = new FormData();
  formData.append("image", imageFile);

  try {
    // Example: send image file to backendUrl/caption/img
    const response = await fetch(`${backendUrl}/caption/img`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Error fetching image caption: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
    //return backendUrl; // Replace with actual caption data when implemented
  } catch (error) {
    console.error("Error in getImageCaption:", error);
    throw error;
  }
}
