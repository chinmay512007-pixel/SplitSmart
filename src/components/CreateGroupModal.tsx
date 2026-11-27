
import { useState } from "react";
import type { FormEvent } from "react";
import { X, Users, Plus, Trash2 } from "lucide-react";

interface CreateGroupModalProps {
  existingGroupNames: string[];
  onClose: () => void;
  onCreate: (group: {
    name: string;
    memberNames: string[];
  }) => void;
}

export default function CreateGroupModal({
  existingGroupNames,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [error, setError] = useState("");

  function addMember() {
    const name = memberInput.trim();

    if (!name) {
      setError("Please enter a member name.");
      return;
    }

    if (
      members.some(
        (member) => member.toLowerCase() === name.toLowerCase()
      )
    ) {
      setError("This member has already been added.");
      return;
    }

    setMembers((current) => [...current, name]);
    setMemberInput("");
    setError("");
  }

  function removeMember(name: string) {
    setMembers((current) =>
      current.filter((member) => member !== name)
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setError("Please enter a group name.");
      return;
    }

    if (
      existingGroupNames.some(
        (name) => name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError("A group with this name already exists.");
      return;
    }

    if (members.length === 0) {
      setError("Please add at least one member.");
      return;
    }

    onCreate({
      name: trimmedName,
      memberNames: members,
    });

    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="expense-modal">
        <div className="modal-header">
          <div>
            <div className="modal-icon">
              <Users size={22} />
            </div>

            <h2>Create a group</h2>
            <p>Add people and start tracking shared expenses.</p>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Group name

            <input
              type="text"
              placeholder="e.g. Goa Trip"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
          </label>

          <div>
            <label>Add members</label>

            <div className="member-input-row">
              <input
                type="text"
                placeholder="Enter member name"
                value={memberInput}
                onChange={(event) => setMemberInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMember();
                  }
                }}
              />

              <button
                type="button"
                className="add-member-button"
                onClick={addMember}
              >
                <Plus size={17} />
                Add
              </button>
            </div>
          </div>

          <div>
            <h3>Group members ({members.length})</h3>

            <div className="participant-list">
              {members.map((member) => (
                <div className="participant-option" key={member}>
                  <span>{member}</span>

                  <button
                    type="button"
                    className="remove-member-button"
                    onClick={() => removeMember(member)}
                    aria-label={`Remove ${member}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {members.length === 0 && (
                <p className="subtitle">
                  No members added yet.
                </p>
              )}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="submit-expense">
            Create group
          </button>
        </form>
      </div>
    </div>
  );
}
