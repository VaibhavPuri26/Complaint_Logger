document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/complaints')
      .then(response => response.json())
      .then(data => {
        const container = document.getElementById('complaints-container');
        data.forEach(complaint => {
          const complaintCard = document.createElement('div');
          complaintCard.classList.add('card', 'mb-3');
          complaintCard.innerHTML = `
            <div class="card-body">
              <h5 class="card-title">Name: ${complaint.name}</h5>
              <h6 class="card-subtitle mb-2 text-muted">Location: ${complaint.location}</h6>
              <p class="card-text">Email: ${complaint.email}</p>
              <p class="card-text">Message: ${complaint.message}</p>
              <p class="card-text">Image Path: ${complaint.img_path}</p>
            </div>
          `;
          container.appendChild(complaintCard);
        });
      })
      .catch(error => console.error('Error fetching complaints:', error));
  });