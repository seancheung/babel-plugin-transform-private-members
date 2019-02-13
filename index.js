module.exports = function({ types: t, template }) {
  const buildSym = template(`
    const ID = Symbol(SYM);
  `);

  function createReference(path, name) {
    const ref = path.scope.generateUidIdentifier(name);
    path.hub.file.path
      .get("body")[0]
      .insertBefore(buildSym({ ID: ref, SYM: t.stringLiteral(name) }));
    return ref;
  }

  return {
    name: "transform-private-members",
    visitor: {
      Class(classPath) {
        const members = {};

        classPath.traverse({
          "ClassMethod|ClassProperty"(memberPath) {
            if (memberPath.node.computed) {
              return;
            }
            if (memberPath.node.accessibility !== "private") {
              return;
            }
            const name = memberPath.node.key.name;
            const ref = createReference(classPath, name);

            members[name] = ref;
            memberPath.node.computed = true;
            memberPath.get("key").replaceWith(ref);
          }
        });

        classPath.traverse({
          ThisExpression(path) {
            const parent = path.parentPath;
            if (parent.isMemberExpression() && !parent.node.computed) {
              const property = parent.get("property");
              const ref = members[property.node.name];

              if (ref) {
                parent.node.computed = true;
                property.replaceWith(ref);
              }
            }
          }
        });
      }
    }
  };
};
