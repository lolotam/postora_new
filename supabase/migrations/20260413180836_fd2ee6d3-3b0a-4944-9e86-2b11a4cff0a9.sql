UPDATE whatsapp_messages 
SET conversation_id = REPLACE(conversation_id, '_+', '_')
WHERE conversation_id LIKE '%\_+%';