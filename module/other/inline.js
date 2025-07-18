export async function handleInlineActions(btnWithAction, messageId) {
  let action = btnWithAction.dataset?.action;
  let message = game.messages.get(messageId);
  let actor = message?.speakerActor;
  if (!actor) return;

  if (action === 'rollback-skill-failure-state') {
    const rollbackFlag = message.getFlag("deltagreen", "rollbacks");
    await actor.update(foundry.utils.deepClone(rollbackFlag));

    toggleAllSkillFailures(rollbackFlag)

    const label = btnWithAction
      .closest(".rollback-section")
      ?.querySelector("label");
    const oldHtml = label.outerHTML;
    label.classList.toggle('strike');

    message.update({
      [`flags.deltagreen.rollbacks`]: rollbackFlag,
      content: message.content
        .replace(oldHtml, label.outerHTML)
    })
  }
}

function toggleAllSkillFailures(data) {
  for (const skill of Object.values(data.system?.skills || {})) {
    skill.failure = !skill.failure;
  }
  for (const skill of Object.values(data.system?.typedSkills || {})) {
    skill.failure = !skill.failure;
  }
}