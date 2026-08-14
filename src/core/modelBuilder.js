function buildModel(componentMap, links) {
  // Process incoming links at this level
  links.forEach((link) => {
    const source = componentMap[link.from];
    const target = componentMap[link.to];
    if (!target) return; // skip IN/OUT or unknown (handled by template)
    target.incoming.push(link.from);
  });

  // Build setValue aliases and recurse into containers
  Object.keys(componentMap).forEach((id) => {
    const comp = componentMap[id];
    const outgoingCount = comp.outgoing.length;

    if (outgoingCount === 0) {
      comp.setValueAliases = {};
    } else if (outgoingCount === 1) {
      comp.setValueAliases = { [comp.outgoing[0].target]: 'setValue' };
    } else {
      comp.setValueAliases = {};
      comp.outgoing.forEach((out) => {
        comp.setValueAliases[out.target] = `setValue${out.target}`;
      });
    }

    if (comp.type === 'Form' && comp.outgoing.some((o) => o.behavior === 'formToForm')) {
      const selectField = comp.fields.find((f) => f.type === 'Select');
      if (!selectField) {
        throw new Error(
          `组件 "${id}" 要建立 Form→Form 连接，但未找到 type="Select" 的字段`
        );
      }
      comp.selectField = selectField.name;
    }

    // Determine Modal role (source = triggered by button, target = auto-opens)
    if (comp.layout === 'Modal') {
      const hasRealIncoming = comp.incoming.some((i) => i !== 'IN');
      const hasRealOutgoing = comp.outgoing.some((o) => o.target !== 'OUT');
      if (hasRealIncoming && hasRealOutgoing) {
        comp.modalRole = 'both';
      } else if (hasRealIncoming) {
        comp.modalRole = 'target';
      } else if (hasRealOutgoing) {
        comp.modalRole = 'source';
      } else {
        comp.modalRole = 'standalone';
      }
    }

    // Recursively process container children
    if (comp.isContainer && comp.children) {
      buildModel(comp.children.componentMap, comp.children.links);
    }
  });

  // For containers with OUT: ensure they have setValue in aliases
  // (aliases from parent-level outgoing already cover this)
  Object.keys(componentMap).forEach((id) => {
    const comp = componentMap[id];
    if (comp.isContainer && comp.hasOut && !comp.setValueAliases) {
      comp.setValueAliases = { __output__: 'setValue' };
    }
  });

  return componentMap;
}

module.exports = { buildModel };
