const API = 'https://bya-serveur.onrender.com';

let panier = JSON.parse(localStorage.getItem('panier')) || [];
let stocks = {};

function sauvegarder() {
  localStorage.setItem('panier', JSON.stringify(panier));
}

// Met à jour le compteur 🛒 dans le header
function mettreAJourCompteur() {
  const total = panier.reduce((acc, item) => acc + item.quantite, 0);
  document.querySelectorAll('#compteur-panier').forEach(c => c.textContent = total);
}

// Ajoute un produit au panier
function ajouterAuPanier(nom, prix) {
  const existant = panier.find(item => item.nom === nom);
  if (existant) {
    existant.quantite += 1;
  } else {
    panier.push({ nom, prix, quantite: 1 });
  }
  sauvegarder();
  mettreAJourCompteur();
  alert(`✅ "${nom}" ajouté au panier !`);
}

// Supprime un produit du panier
function supprimerDuPanier(nom) {
  panier = panier.filter(item => item.nom !== nom);
  sauvegarder();
  mettreAJourCompteur();
  afficherPanier();
}

// Ajoute (+1) ou enlève (-1) un exemplaire depuis le panier
function changerQuantite(nom, delta) {
  const item = panier.find(i => i.nom === nom);
  if (!item) return;

  const nouvelle = item.quantite + delta;

  if (nouvelle < 1) {
    supprimerDuPanier(nom);
    return;
  }

  if (delta > 0 && stocks[nom] !== undefined && nouvelle > stocks[nom]) {
    alert(`Il ne reste que ${stocks[nom]} exemplaire(s) de "${nom}".`);
    return;
  }

  item.quantite = nouvelle;
  sauvegarder();
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

  liste.innerHTML = panier.map(item => {
    const stockMax = stocks[item.nom];
    const plusBloque = stockMax !== undefined && item.quantite >= stockMax;
    return `
    <div class="ligne-panier">
      <span class="nom-produit">${item.nom}</span>
      <div class="quantite-controle">
        <button class="btn-qte" onclick="changerQuantite('${item.nom}', -1)" aria-label="Enlever un">−</button>
        <span class="qte-nombre">${item.quantite}</span>
        <button class="btn-qte" onclick="changerQuantite('${item.nom}', 1)" aria-label="Ajouter un" ${plusBloque ? 'disabled' : ''}>+</button>
      </div>
      <span class="sous-total">${(item.prix * item.quantite).toFixed(2)} €</span>
      <button class="supprimer" onclick="supprimerDuPanier('${item.nom}')">✕</button>
    </div>`;
  }).join('');

  const total = panier.reduce((acc, item) => acc + item.prix * item.quantite, 0);
  totalEl.textContent = total.toFixed(2) + ' €';
}

// Charge le stock en direct (pour bloquer le + quand il n'y en a plus)
async function chargerStocks() {
  if (!document.getElementById('liste-panier')) return;
  try {
    const reponse = await fetch(API + '/produits');
    const produits = await reponse.json();
    produits.forEach(p => { stocks[p.nom] = p.stock; });
    afficherPanier();
  } catch (erreur) {
    console.error('Impossible de charger le stock :', erreur);
  }
}

// Envoie le panier + la zone de livraison au serveur
async function passerCommande() {
  if (panier.length === 0) return;

  const zone = document.getElementById('zone-livraison').value;
  if (!zone) {
    alert('Choisis ta zone de livraison avant de payer.');
    return;
  }

  const bouton = document.getElementById('bouton-payer');
  bouton.textContent = 'Chargement...';
  bouton.disabled = true;

  try {
    const reponse = await fetch(API + '/creer-paiement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        panier: panier.map(item => ({ nom: item.nom, quantite: item.quantite })),
        zone: zone
      })
    });

    const data = await reponse.json();

    if (!reponse.ok) {
      alert(data.erreur || 'Erreur lors du paiement. Réessaie.');
      bouton.textContent = 'Payer maintenant';
      bouton.disabled = false;
      return;
    }

    window.location.href = data.url;

  } catch (erreur) {
    alert('Erreur lors du paiement. Réessaie.');
    bouton.textContent = 'Payer maintenant';
    bouton.disabled = false;
  }
}

// Ajoute automatiquement le badge "Épuisé" selon le stock en direct
async function afficherBadgesEpuise() {
  const cartes = document.querySelectorAll('a.carte');
  if (cartes.length === 0) return;

  try {
    const reponse = await fetch(API + '/produits');
    const produits = await reponse.json();

    cartes.forEach(carte => {
      const href = carte.getAttribute('href') || '';
      const params = new URLSearchParams(href.split('?')[1]);
      const nom = params.get('nom');
      const produit = produits.find(p => p.nom === nom);

      if (produit && produit.stock === 0 && !carte.querySelector('.badge-epuise')) {
        const badge = document.createElement('span');
        badge.className = 'badge-epuise';
        badge.textContent = 'Épuisé';
        carte.insertBefore(badge, carte.firstChild);
      }
    });
  } catch (erreur) {
    console.error('Impossible de charger le stock :', erreur);
  }
}

// Après un paiement réussi : on vide le panier et on remercie
function gererRetourPaiement() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('paiement') === 'reussi') {
    panier = [];
    sauvegarder();
    const merci = document.getElementById('message-merci');
    if (merci) merci.style.display = 'block';
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Ouvre / ferme le menu ☰
function basculerMenu() {
  document.getElementById('menu-liens').classList.toggle('ouvert');
}

gererRetourPaiement();
mettreAJourCompteur();
afficherPanier();
chargerStocks();
afficherBadgesEpuise();