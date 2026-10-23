/** WhatsApp / Meta Cloud API max for video messages (H.264 + AAC). */
export const WHATSAPP_VIDEO_MESSAGE_MAX_BYTES = 16 * 1024 * 1024

/** Max upload for outbound inbox media (documents, images, audio, video-as-file). */
export const WHATSAPP_OUTBOUND_MEDIA_MAX_BYTES = 100 * 1024 * 1024

export const WHATSAPP_OUTBOUND_MEDIA_MAX_MB = Math.floor(WHATSAPP_OUTBOUND_MEDIA_MAX_BYTES / 1024 / 1024)

export const WHATSAPP_VIDEO_MESSAGE_MAX_MB = Math.floor(WHATSAPP_VIDEO_MESSAGE_MAX_BYTES / 1024 / 1024)
