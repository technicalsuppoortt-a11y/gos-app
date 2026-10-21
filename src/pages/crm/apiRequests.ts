// Derived from the supplied Postman collection. Request examples are data, never executed scripts.
export const apiRequests = [
  {
    "group": "Health and auth",
    "name": "Health",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/health",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "Health and auth",
    "name": "Current user",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/auth/me",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "Health and auth",
    "name": "Verify token",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/auth/verify",
    "body": "{}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "Health and auth",
    "name": "Firestore status",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/firestore/status",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "Health and auth",
    "name": "login Copy",
    "method": "POST",
    "url": "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={{google_api_key_0ngw}}",
    "body": "",
    "multipart": false,
    "expected": []
  },
  {
    "group": "CRM — run in order",
    "name": "List pipelines",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/crm/pipelines",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Show pipeline",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/crm/pipelines/{{pipelineId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "List presets",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/crm/pipelines/presets",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Install preset",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/pipelines/presets/follow-up",
    "body": "{}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Create lead",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads",
    "body": "{\n  \"name\": \"Sarah Chen\",\n  \"email\": \"sarah.{{$timestamp}}@example.com\",\n  \"phone\": \"+1 555 0100\",\n  \"company\": \"Nova Studio\",\n  \"source\": \"Landing page\",\n  \"owner\": \"Alex Morgan\",\n  \"value\": 1200,\n  \"pipeline_id\": \"{{pipelineId}}\",\n  \"lifecycle_stage\": \"LEAD_CAPTURED\",\n  \"tags\": [\"Coaching\"]\n}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Show lead",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/crm/leads/{{leadId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Update lead",
    "method": "PATCH",
    "url": "{{baseUrl}}/api/v1/crm/leads/{{leadId}}",
    "body": "{\n  \"phone\": \"+1 555 0199\",\n  \"owner\": \"Jamie Park\",\n  \"value\": 1500\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Move stage",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads/{{leadId}}/stage",
    "body": "{\n  \"lifecycle_stage\": \"CONTACT_CREATED\"\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Add note",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads/{{leadId}}/notes",
    "body": "{\n  \"note\": \"Called the studio\"\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "List leads",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/crm/leads?pipeline_id={{pipelineId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Export leads",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/crm/leads/export?pipeline_id={{pipelineId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Import leads",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads/import",
    "body": "{\n  \"pipeline_id\": \"{{pipelineId}}\",\n  \"duplicates\": \"skip\",\n  \"mapping\": {\n    \"name\": 0,\n    \"email\": 1,\n    \"company\": 2,\n    \"value\": 3\n  },\n  \"csv\": \"name,email,company,value\\nOmar Ali,omar.{{$timestamp}}@example.com,Northstar,500\\n\"\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — run in order",
    "name": "Bulk tag",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads/bulk",
    "body": "{\n  \"lead_ids\": [\"{{leadId}}\"],\n  \"action\": \"tag\",\n  \"value\": \"High Intent\"\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "CRM — more examples",
    "name": "Create pipeline",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/pipelines",
    "body": "{\n  \"name\": \"Custom pipeline\",\n  \"stages\": [\n    { \"id\": \"LEAD_CAPTURED\", \"label\": \"New Lead\", \"color\": \"#2396ef\" },\n    { \"id\": \"QUALIFIED\", \"label\": \"Qualified\", \"color\": \"#10b981\" },\n    { \"id\": \"BOOKING\", \"label\": \"Booking\", \"color\": \"#f59e0b\" }\n  ]\n}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "CRM — more examples",
    "name": "Update pipeline",
    "method": "PUT",
    "url": "{{baseUrl}}/api/v1/crm/pipelines/{{pipelineId}}",
    "body": "{\n  \"name\": \"Custom pipeline\",\n  \"stages\": [\n    { \"id\": \"LEAD_CAPTURED\", \"label\": \"Captured\", \"color\": \"#2396ef\" },\n    { \"id\": \"QUALIFIED\", \"label\": \"Qualified\", \"color\": \"#10b981\" },\n    { \"id\": \"BOOKING\", \"label\": \"Booking\", \"color\": \"#f59e0b\" }\n  ]\n}",
    "multipart": false,
    "expected": []
  },
  {
    "group": "CRM — more examples",
    "name": "Bulk assign owner",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads/bulk",
    "body": "{\n  \"lead_ids\": [\"{{leadId}}\"],\n  \"action\": \"owner\",\n  \"value\": \"Taylor Reed\"\n}",
    "multipart": false,
    "expected": []
  },
  {
    "group": "CRM — more examples",
    "name": "Bulk move stage",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/crm/leads/bulk",
    "body": "{\n  \"lead_ids\": [\"{{leadId}}\"],\n  \"action\": \"stage\",\n  \"value\": \"QUALIFIED\"\n}",
    "multipart": false,
    "expected": []
  },
  {
    "group": "CRM — more examples",
    "name": "Delete lead",
    "method": "DELETE",
    "url": "{{baseUrl}}/api/v1/crm/leads/{{leadId}}",
    "body": "",
    "multipart": false,
    "expected": []
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Reject client tenant id",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/ai/sources",
    "body": "{\n  \"tenant_id\": \"someone-else\",\n  \"name\": \"Ignored\",\n  \"type\": \"text\",\n  \"content\": \"This must not be stored.\"\n}",
    "multipart": false,
    "expected": [
      422
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Show assistant",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/ai/assistant",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Create text source",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/ai/sources",
    "body": "{\n  \"name\": \"Coaching notes\",\n  \"type\": \"text\",\n  \"content\": \"We offer online coaching for twelve weeks. Sessions are in Cairo. The program does not include bicycles.\"\n}",
    "multipart": false,
    "expected": [
      202
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Get source",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/ai/sources/{{sourceId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Create instructions",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/ai/sources",
    "body": "{\n  \"name\": \"Tone\",\n  \"type\": \"instructions\",\n  \"content\": \"Never invent a price. If the notes do not answer, say a teammate will follow up.\"\n}",
    "multipart": false,
    "expected": [
      202
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Ask playground",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/ai/playground",
    "body": "{\n  \"question\": \"Do you have online coaching?\"\n}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Grade playground answer",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/ai/playground/{{playgroundTestId}}/grade",
    "body": "{\n  \"verdict\": \"correct\",\n  \"note\": \"Matched the coaching notes.\"\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "List playground tests",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/ai/playground",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Turn live replies off",
    "method": "PUT",
    "url": "{{baseUrl}}/api/v1/ai/assistant",
    "body": "{\n  \"live_enabled\": false\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Inbox while live is off",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/inbox/messages",
    "body": "{\n  \"channel\": \"whatsapp\",\n  \"external_thread_id\": \"thread-paused-{{$timestamp}}\",\n  \"external_message_id\": \"wamid-paused-{{$timestamp}}\",\n  \"customer_name\": \"Omar\",\n  \"body\": \"Do you have online coaching?\"\n}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Enable WhatsApp replies",
    "method": "PUT",
    "url": "{{baseUrl}}/api/v1/ai/assistant",
    "body": "{\n  \"live_enabled\": true,\n  \"channels\": {\n    \"whatsapp\": true,\n    \"instagram\": false,\n    \"messenger\": false,\n    \"facebook\": false,\n    \"webchat\": false\n  }\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Inbox answer",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/inbox/messages",
    "body": "{\n  \"channel\": \"whatsapp\",\n  \"external_thread_id\": \"thread-coach\",\n  \"external_message_id\": \"{{externalMessageId}}\",\n  \"customer_name\": \"Omar\",\n  \"body\": \"Do you have online coaching?\"\n}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Duplicate inbox message",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/inbox/messages",
    "body": "{\n  \"channel\": \"whatsapp\",\n  \"external_thread_id\": \"thread-coach\",\n  \"external_message_id\": \"{{externalMessageId}}\",\n  \"customer_name\": \"Omar\",\n  \"body\": \"Do you have online coaching?\"\n}",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Inbox handoff",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/inbox/messages",
    "body": "{\n  \"channel\": \"whatsapp\",\n  \"external_thread_id\": \"thread-handoff-{{$timestamp}}\",\n  \"external_message_id\": \"wamid-handoff-{{$timestamp}}\",\n  \"customer_name\": \"Omar\",\n  \"body\": \"What is your refund policy for gift cards?\"\n}",
    "multipart": false,
    "expected": [
      201
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "List conversations",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/inbox/conversations",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Show conversation",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/inbox/conversations/{{conversationId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI and inbox — run in order",
    "name": "Delete text source",
    "method": "DELETE",
    "url": "{{baseUrl}}/api/v1/ai/sources/{{sourceId}}",
    "body": "",
    "multipart": false,
    "expected": [
      200
    ]
  },
  {
    "group": "AI — optional file",
    "name": "Upload a knowledge file",
    "method": "POST",
    "url": "{{baseUrl}}/api/v1/ai/sources",
    "body": "",
    "multipart": true,
    "expected": []
  },
  {
    "group": "AI — optional file",
    "name": "List sources",
    "method": "GET",
    "url": "{{baseUrl}}/api/v1/ai/sources",
    "body": "",
    "multipart": false,
    "expected": []
  }
] as const;
