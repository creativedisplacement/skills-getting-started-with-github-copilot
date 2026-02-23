document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message and reset select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Build participants DOM so we can attach remove handlers
        const participantsDiv = document.createElement('div');
        participantsDiv.className = 'participants';
        const participantsLabel = document.createElement('strong');
        participantsLabel.textContent = 'Participants:';
        participantsDiv.appendChild(participantsLabel);

        if (details.participants && details.participants.length > 0) {
          const ul = document.createElement('ul');
          ul.className = 'participants-list';

          details.participants.forEach(p => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = p;

            const btn = document.createElement('button');
            btn.className = 'remove-participant';
            btn.title = 'Unregister';
            btn.type = 'button';
            btn.textContent = '✖';

            btn.addEventListener('click', async () => {
              if (!confirm(`Remove ${p} from ${name}?`)) return;
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`,
                  { method: 'POST' }
                );
                const payload = await res.json();
                if (res.ok) {
                  messageDiv.textContent = payload.message;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                  await fetchActivities();
                } else {
                  messageDiv.textContent = payload.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                }
              } catch (err) {
                messageDiv.textContent = 'Failed to remove participant.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                console.error('Error removing participant:', err);
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
        } else {
          const pEl = document.createElement('p');
          pEl.className = 'no-participants';
          pEl.textContent = 'No participants yet';
          participantsDiv.appendChild(pEl);
        }

        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Optimistically update the UI so the new participant appears immediately
        try {
          const cards = Array.from(document.querySelectorAll('.activity-card'));
          const targetCard = cards.find(c => {
            const h = c.querySelector('h4');
            return h && h.textContent === activity;
          });

          if (targetCard) {
            let ul = targetCard.querySelector('.participants-list');
            if (!ul) {
              // create participants container
              const participantsDiv = targetCard.querySelector('.participants');
              if (!participantsDiv) {
                const div = document.createElement('div');
                div.className = 'participants';
                div.innerHTML = '<strong>Participants:</strong>';
                targetCard.appendChild(div);
              }
              ul = document.createElement('ul');
              ul.className = 'participants-list';
              const noP = targetCard.querySelector('.no-participants');
              if (noP) noP.remove();
              targetCard.querySelector('.participants').appendChild(ul);
            }

            // add new list item with same structure as rendered items
            const li = document.createElement('li');
            li.className = 'participant-item';
            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = email;
            const btn = document.createElement('button');
            btn.className = 'remove-participant';
            btn.type = 'button';
            btn.title = 'Unregister';
            btn.textContent = '✖';
            btn.addEventListener('click', async () => {
              if (!confirm(`Remove ${email} from ${activity}?`)) return;
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
                  { method: 'POST' }
                );
                const payload = await res.json();
                if (res.ok) {
                  messageDiv.textContent = payload.message;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                  await fetchActivities();
                } else {
                  messageDiv.textContent = payload.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                }
              } catch (err) {
                messageDiv.textContent = 'Failed to remove participant.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                console.error('Error removing participant:', err);
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          }
        } catch (err) {
          console.error('Optimistic UI update failed:', err);
        }

        // Refresh activities so participants and availability update
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
