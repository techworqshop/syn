import json
p = '/root/synweb/infra/synweb-workflows/SynWeb_Coordinator.json'
with open(p) as f: data = json.load(f)
wf = data[0] if isinstance(data, list) else data
for n in wf['nodes']:
    if n.get('name') == 'Run Persona' and n.get('type') == '@n8n/n8n-nodes-langchain.toolWorkflow':
        wi = n['parameters']['workflowInputs']
        schema = wi.get('schema', [])
        schema[:] = [s for s in schema if s.get('id') != 'rigidity_instruction']
        if not any(s.get('id') == 'rigidity' for s in schema):
            schema.append({
                'id': 'rigidity', 'displayName': 'rigidity', 'type': 'number',
                'required': False, 'display': True, 'removed': False,
                'readOnly': False, 'defaultMatch': False
            })
        val = wi.get('value', {})
        val.pop('rigidity_instruction', None)
        val['rigidity'] = "={{ $fromAI('rigidity', 'This personas rigidity/flexibility 0-10. Look it up via Read Personas tool for the persona. 0-3 standhaft, 4-6 ausgewogen, 7-10 offen. Default 5.', 'number') }}"
        desc = n['parameters'].get('description', '')
        n['parameters']['description'] = desc.replace('rigidity_instruction (optional for round 2+)', 'rigidity (int 0-10, look up per-persona via Read Personas)')
with open(p,'w') as f: json.dump(data, f, indent=2)
print('coord patched')
