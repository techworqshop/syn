import json, sys
p = '/root/synweb/infra/synweb-workflows/SynWeb_RunPersona.json'
with open(p) as f: data = json.load(f)
wf = data[0] if isinstance(data, list) else data
haltung = "HALTUNG: {{ ($json.rigidity ?? 5) <= 3 ? 'Du bist standhaft. Bleib bei deiner Position, selbst bei guten Gegenargumenten.' : ($json.rigidity ?? 5) <= 6 ? 'Ausgewogen. Update nur bei wirklich starken neuen Argumenten.' : 'Offen. Aktualisiere deine Position aktiv basierend auf neuen Infos.' }}"
old = "{{ $json.rigidity_instruction ? 'RIGIDITY INSTRUCTION:\\n' + $json.rigidity_instruction : '' }}"
for n in wf['nodes']:
    if n['name'] in ('Run Persona Analysis', 'Run Persona No Files'):
        msgs = n['parameters']['messages']['values']
        for m in msgs:
            m['content'] = m['content'].replace(old, haltung)
    if n['name'] == 'Execute Workflow Trigger':
        vals = n['parameters']['workflowInputs']['values']
        vals[:] = [v for v in vals if v.get('name') != 'rigidity_instruction']
        if not any(v.get('name') == 'rigidity' for v in vals):
            vals.insert(7, {'name': 'rigidity', 'type': 'number'})
with open(p,'w') as f: json.dump(data, f, indent=2)
print('patched')
