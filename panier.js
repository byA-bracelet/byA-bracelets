// Charge le panier depuis la mémoire du navigateur
let panier = JSON.parse(localStorage.getItem('panier')) || [];

// Met à jour le compteur dans le header (le chiffre sur le 🛒)
function mettreAJourCompteur() {
  const total = panier.reduce((acc, item) => acc + item.quantite, 0);
  const compteurs = document.querySelectorAll('#compteur-panier');
  compteurs.forEach(c => c.textContent = total);
}

// Ajoute un produit au panier
function ajouterAuPanier(nom, prix) {
  const existant = panier.find(item => item.nom === nom);
  if (existant) {
    existant.quantite += 1;
  } else {
    panier.push({ nom, prix, quantite: 1 });
  }
  localStorage.setItem('panier', JSON.stringify(panier));
  mettreAJourCompteur();
  alert(`✅ "${nom}" ajouté au panier !`);
}

// Supprime un produit du panier
function supprimerDuPanier(nom) {
  panier = panier.filter(item => item.nom !== nom);
  localStorage.setItem('panier', JSON.stringify(panier));
  mettreAJourCompteur();
  afficherPanier();
}

// Affiche le contenu du panier sur panier.html
function afficherPanier() {
  const liste = document.getElementById('liste-panier');
  const vide = document.getElementById('panier-vide');
  const resume = document.getElementById('resume-panier');
  const totalEl = document.getElementById('total-panier');

  if (!liste) return;

  if (panier.length === 0) {
    liste.innerHTML = '';
    vide.style.display = 'block';
    resume.style.display = 'none';
    return;
  }

  vide.style.display = 'none';
  resume.style.display = 'block';

  liste.innerHTML = panier.map(item => `
    <div class="ligne-panier">
      <span class="nom-produit">${item.nom}</span>
      <span class="qte">x${item.quantite}</span>
      <span class="sous-total">${(item.prix * item.quantite).toFixed(2)} €</span>
      <button class="supprimer" onclick="supprimerDuPanier('${item.nom}')">✕</button>
    </div>
  `).join('');

  const total = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);
  totalEl.textContent = total.toFixed(2) + ' €';
}

// Envoie le panier au serveur pour créer le paiement Stripe
async function passerCommande() {
  if (panier.length === 0) return;

  const bouton = document.getElementById('bouton-payer');
  bouton.textContent = 'Chargement...';
  bouton.disabled = true;

  try {
    const reponse = await fetch('https://bya-serveur.onrender.com/creer-paiement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panier })
    });

    const data = await reponse.json();
    window.location.href = data.url;

  } catch (erreur) {
    alert('Erreur lors du paiement. Réessaie.');
    bouton.textContent = 'Payer maintenant';
    bouton.disabled = false;
  }
}

// Lance tout au chargement de la page
mettreAJourCompteur();
afficherPanier();
