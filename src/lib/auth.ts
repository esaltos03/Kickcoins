import { supabase } from './supabase';
import {
  createUserProfile,
  updateUserProfile,
  getAllUserProfiles,
  submitVote,
  getUserVotes,
  placeBet,
  getUserBets,
  getAllBets,
  resolveBet,
  saveBetHistory,
  getUserBetHistory,
  distributeCoins,
  resetVoting,
  clearAvailableCoins
} from './lib/database';

// Authentication functions
export async function signUp(username: string, password: string) {
  const email = `${username}@kickcoins.local`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('already registered')) {
      throw new Error('Username already exists');
    }
    throw error;
  }

  if (data.user) {
    // Create user profile
    await createUserProfile(data.user.id, username);
  }

  return data;
}

export async function signIn(username: string, password: string) {
  const email = `${username}@kickcoins.local`;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Global state
let currentUser: any = null;
let currentProfile: any = null;
let matchActive = false;
let bettingOpen = false;

const players = ["Erick", "Yansy", "Bernie", "Erubial", "Samir", "Angel", "Abel", "Estress", "Alan", "Ace"];
const propsTemplate = ["Assist", "Score", "Anything"];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is already logged in
  const user = await getCurrentUser();
  if (user) {
    try {
      currentUser = user;
      currentProfile = await getUserProfile(user.id);
      showApp();
    } catch (error) {
      console.error('Error loading user profile:', error);
      showLogin();
    }
  } else {
    showLogin();
  }

  setupEventListeners();
});

function setupEventListeners() {
  // Login/Create Account
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('create-btn')?.addEventListener('click', handleCreateAccount);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tc => (tc as HTMLElement).style.display = 'none');
      const tabContent = document.getElementById(tab.getAttribute('data-tab') + '-tab');
      if (tabContent) tabContent.style.display = 'block';
      
      updateUI();
      if (tab.getAttribute('data-tab') === 'history') updateHistory();
      if (tab.getAttribute('data-tab') === 'leaderboard') updateLeaderboards();
    });
  });

  // Voting
  document.getElementById('submit-votes')?.addEventListener('click', handleSubmitVotes);

  // Betting
  document.getElementById('player-select')?.addEventListener('change', populateProps);
  document.getElementById('submit-bets')?.addEventListener('click', handleSubmitBets);

  // Admin controls
  document.getElementById('open-bets')?.addEventListener('click', handleOpenBets);
  document.getElementById('close-bets')?.addEventListener('click', handleCloseBets);
  document.getElementById('start-match')?.addEventListener('click', handleStartMatch);
  document.getElementById('end-match')?.addEventListener('click', handleEndMatch);
}

// Authentication handlers
async function handleLogin() {
  const username = (document.getElementById('login-username') as HTMLInputElement).value;
  const password = (document.getElementById('login-password') as HTMLInputElement).value;

  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }

  try {
    const { user } = await signIn(username, password);
    if (user) {
      currentUser = user;
      currentProfile = await getUserProfile(user.id);
      showApp();
      alert('Logged in successfully!');
    }
  } catch (error: any) {
    if (error.message.includes('Invalid login credentials')) {
      alert('Invalid username or password. Please check your credentials and try again.');
    } else {
      alert('Login failed: ' + error.message);
    }
  }
}

async function handleCreateAccount() {
  const username = (document.getElementById('login-username') as HTMLInputElement).value;
  const password = (document.getElementById('login-password') as HTMLInputElement).value;

  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters long');
    return;
  }

  try {
    await signUp(username, password);
    alert('Account created successfully! You can now login with your credentials.');
  } catch (error: any) {
    if (error.message.includes('Username already exists')) {
      alert('This username is already taken. Please choose a different username.');
    } else {
      alert('Account creation failed: ' + error.message);
    }
  }
}

async function handleLogout() {
  try {
    await signOut();
    currentUser = null;
    currentProfile = null;
    showLogin();
  } catch (error: any) {
    alert('Logout failed: ' + error.message);
  }
}

// UI Management
function showLogin() {
  const loginCard = document.getElementById('login-card');
  const app = document.getElementById('app');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (loginCard) loginCard.style.display = 'block';
  if (app) app.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';
}

function showApp() {
  const loginCard = document.getElementById('login-card');
  const app = document.getElementById('app');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (loginCard) loginCard.style.display = 'none';
  if (app) app.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'inline';
  
  updateUI();
  populateVoting();
  populatePlayers();
  updateLeaderboards();
  updateHistory();
}

async function updateUI() {
  if (!currentUser || !currentProfile) return;

  // Refresh profile data
  try {
    currentProfile = await getUserProfile(currentUser.id);
    const accountInfo = document.getElementById('account-info');
    if (accountInfo) {
      accountInfo.innerHTML = `${currentProfile.username} | Total: ${currentProfile.total_coins} 💰 | Available: ${currentProfile.available_coins} 💸`;
    }

    // Show/hide admin tab
    const adminTab = document.querySelector('[data-tab="admin"]') as HTMLElement;
    if (adminTab) {
      adminTab.style.display = currentProfile.is_admin ? 'block' : 'none';
    }

    // Update balance display in betting tab
    const balanceDisplay = document.getElementById('balance-display');
    if (balanceDisplay) {
      balanceDisplay.innerHTML = `Available to bet: ${currentProfile.available_coins} 💸`;
    }
  } catch (error) {
    console.error('Error updating UI:', error);
  }
}

// Voting functions
function populateVoting() {
  ["vote1", "vote2", "vote3"].forEach(id => {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (select) {
      select.innerHTML = "";
      players.forEach(player => {
        const option = document.createElement("option");
        option.value = player;
        option.text = player;
        select.appendChild(option);
      });
    }
  });
}

async function handleSubmitVotes() {
  if (!matchActive) {
    alert("Match not started yet.");
    return;
  }
  
  if (currentProfile.voted) {
    alert("Already voted.");
    return;
  }

  const first = (document.getElementById('vote1') as HTMLSelectElement).value;
  const second = (document.getElementById('vote2') as HTMLSelectElement).value;
  const third = (document.getElementById('vote3') as HTMLSelectElement).value;

  if (new Set([first, second, third]).size < 3) {
    alert("Cannot vote same player multiple times.");
    return;
  }

  try {
    await submitVote(currentUser.id, first, second, third);
    alert("Votes submitted!");
    updateUI();
  } catch (error: any) {
    alert('Error submitting votes: ' + error.message);
  }
}

// Betting functions
function populatePlayers() {
  const select = document.getElementById('player-select') as HTMLSelectElement;
  if (select) {
    select.innerHTML = "";
    players.forEach(player => {
      const option = document.createElement("option");
      option.value = player;
      option.text = player;
      select.appendChild(option);
    });
  }
}

function populateProps() {
  const container = document.getElementById('props-container');
  if (!container) return;

  container.innerHTML = "";
  const player = (document.getElementById('player-select') as HTMLSelectElement).value;
  
  propsTemplate.forEach(prop => {
    const card = document.createElement("div");
    card.className = "prop";
    
    const label = document.createElement("span");
    label.textContent = `${prop} (4x)`;
    label.className = "green";
    
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = currentProfile?.available_coins?.toString() || "0";
    input.oninput = updatePotentialPayout;
    
    card.appendChild(label);
    card.appendChild(input);
    container.appendChild(card);
  });
  
  updatePotentialPayout();
}

function updatePotentialPayout() {
  const container = document.getElementById('props-container');
  if (!container) return;

  let total = 0;
  Array.from(container.children).forEach(prop => {
    const input = prop.querySelector('input') as HTMLInputElement;
    const span = prop.querySelector('span') as HTMLSpanElement;
    const amount = Number(input.value);
    const odds = parseInt(span.textContent?.split('(')[1] || '4');
    total += amount * odds;
    
    const color = amount * odds > 50 ? 'green' : 'yellow';
    span.style.color = color;
  });

  const payoutDisplay = document.getElementById('total-payout');
  if (payoutDisplay) {
    payoutDisplay.textContent = total.toString();
    payoutDisplay.style.color = total > 50 ? 'green' : 'yellow';
  }
}

async function handleSubmitBets() {
  if (!bettingOpen) {
    alert("Betting not open.");
    return;
  }

  const container = document.getElementById('props-container');
  if (!container) return;

  const player = (document.getElementById('player-select') as HTMLSelectElement).value;
  const bets = [];

  try {
    for (const propElement of Array.from(container.children)) {
      const input = propElement.querySelector('input') as HTMLInputElement;
      const span = propElement.querySelector('span') as HTMLSpanElement;
      const amount = Number(input.value);
      
      if (amount > 0) {
        if (currentProfile.available_coins >= amount) {
          const propName = span.textContent?.split(' (')[0] || '';
          await placeBet(currentUser.id, player, propName, amount, 4);
          
          // Update available coins
          currentProfile.available_coins -= amount;
          await updateUserProfile(currentUser.id, { available_coins: currentProfile.available_coins });
          
          bets.push({ player, prop: propName, amount, odds: 4 });
        } else {
          alert("Cannot bet more than available balance");
          return;
        }
      }
    }

    if (bets.length > 0) {
      updateUI();
      updatePotentialPayout();
      alert("Bets placed!");
    }
  } catch (error: any) {
    alert('Error placing bets: ' + error.message);
  }
}

// Leaderboard functions
async function updateLeaderboards() {
  try {
    // Get all user profiles
    const profiles = await getAllUserProfiles();
    
    // Calculate MVP scores if match is active
    let mvpScores: { [key: string]: number } = {};
    players.forEach(p => mvpScores[p] = 0);

    if (matchActive) {
      const votes = await getUserVotes();
      votes.forEach(vote => {
        mvpScores[vote.first_place] += 5;
        mvpScores[vote.second_place] += 3;
        mvpScores[vote.third_place] += 2;
      });
    }

    // Update MVP leaderboard
    const mvpSorted = Object.entries(mvpScores).sort((a, b) => b[1] - a[1]);
    const mvpTbody = document.querySelector('#mvp-leaderboard tbody');
    if (mvpTbody) {
      mvpTbody.innerHTML = "";
      mvpSorted.forEach((entry, i) => {
        const tr = document.createElement("tr");
        const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i < 7 ? '🪨' : '🍆';
        tr.innerHTML = `<td>${i + 1} ${icon}</td><td>${entry[0]}</td><td>${entry[1]}</td>`;
        mvpTbody.appendChild(tr);
      });
    }

    // Update coin leaderboard
    const coinSorted = profiles.filter(p => !p.is_admin).sort((a, b) => b.total_coins - a.total_coins);
    const coinTbody = document.querySelector('#coin-leaderboard tbody');
    if (coinTbody) {
      coinTbody.innerHTML = "";
      coinSorted.forEach((profile, i) => {
        const tr = document.createElement("tr");
        const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i < 7 ? '🪨' : '🍆';
        const deleteBtn = currentProfile?.is_admin ? 
          `<button onclick="deleteUser('${profile.id}')">Delete</button>` : '';
        tr.innerHTML = `<td>${i + 1} ${icon}</td><td>${profile.username}</td><td>${profile.total_coins}</td><td>${deleteBtn}</td>`;
        coinTbody.appendChild(tr);
      });
    }
  } catch (error) {
    console.error('Error updating leaderboards:', error);
  }
}

// History functions
async function updateHistory() {
  if (!currentUser) return;

  try {
    const history = await getUserBetHistory(currentUser.id);
    const container = document.getElementById('history-container');
    if (!container) return;

    container.innerHTML = "";
    history.forEach(record => {
      const div = document.createElement('div');
      div.style.border = '1px solid #666';
      div.style.margin = '5px';
      div.style.padding = '5px';
      div.innerHTML = `<strong>${record.match_name}</strong><br>`;
      
      if (Array.isArray(record.bets_data)) {
        record.bets_data.forEach((bet: any) => {
          const color = bet.won ? 'green' : 'red';
          div.innerHTML += `<span style="color:${color}">${bet.player} - ${bet.prop} - Bet: ${bet.amount} - ${bet.won ? `Won ${bet.amount * bet.odds}` : `Lost ${bet.amount}`}</span><br>`;
        });
      }
      
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Error updating history:', error);
  }
}

// Admin functions
async function handleOpenBets() {
  if (!currentProfile?.is_admin) {
    alert("Only admin");
    return;
  }

  if (!confirm("Confirm open betting and distribute 10 coins to all users?")) return;

  try {
    await distributeCoins(10);
    bettingOpen = true;
    
    const openBtn = document.getElementById('open-bets') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-bets') as HTMLButtonElement;
    if (openBtn) openBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = false;
    
    updateUI();
    alert("Betting opened and coins distributed!");
  } catch (error: any) {
    alert('Error opening bets: ' + error.message);
  }
}

async function handleCloseBets() {
  if (!currentProfile?.is_admin) {
    alert("Only admin");
    return;
  }

  if (!confirm("Confirm closing betting. Unused coins will be discarded.")) return;

  try {
    await clearAvailableCoins();
    bettingOpen = false;
    
    const closeBtn = document.getElementById('close-bets') as HTMLButtonElement;
    const startBtn = document.getElementById('start-match') as HTMLButtonElement;
    if (closeBtn) closeBtn.disabled = true;
    if (startBtn) startBtn.disabled = false;
    
    updateUI();
    alert("Betting closed!");
  } catch (error: any) {
    alert('Error closing bets: ' + error.message);
  }
}

async function handleStartMatch() {
  if (!currentProfile?.is_admin) {
    alert("Only admin");
    return;
  }

  try {
    await resetVoting();
    matchActive = true;
    
    const startBtn = document.getElementById('start-match') as HTMLButtonElement;
    const endBtn = document.getElementById('end-match') as HTMLButtonElement;
    if (startBtn) startBtn.disabled = true;
    if (endBtn) endBtn.disabled = false;
    
    updateLeaderboards();
    alert("Match started!");
  } catch (error: any) {
    alert('Error starting match: ' + error.message);
  }
}

async function handleEndMatch() {
  if (!currentProfile?.is_admin) {
    alert("Only admin");
    return;
  }

  try {
    // Get all unresolved bets
    const allBets = await getAllBets();
    const profiles = await getAllUserProfiles();
    
    // Group bets by user
    const betsByUser: { [userId: string]: any[] } = {};
    allBets.forEach(bet => {
      if (!bet.resolved) {
        if (!betsByUser[bet.user_id]) betsByUser[bet.user_id] = [];
        betsByUser[bet.user_id].push(bet);
      }
    });

    // Resolve each bet
    for (const [userId, userBets] of Object.entries(betsByUser)) {
      const userProfile = profiles.find(p => p.id === userId);
      if (!userProfile) continue;

      let totalWinnings = 0;
      const resolvedBets = [];

      for (const bet of userBets) {
        const won = confirm(`Did ${bet.player} succeed in ${bet.prop}? (OK=Win, Cancel=Lose)`);
        await resolveBet(bet.id, won);
        
        if (won) {
          totalWinnings += bet.amount * bet.odds;
        }
        
        resolvedBets.push({ ...bet, won, resolved: true });
      }

      // Update user's total coins
      if (totalWinnings > 0) {
        await updateUserProfile(userId, {
          total_coins: userProfile.total_coins + totalWinnings
        });
      }

      // Save to history
      if (resolvedBets.length > 0) {
        const matchNumber = (await getUserBetHistory(userId)).length + 1;
        await saveBetHistory(userId, `Match ${matchNumber}`, resolvedBets);
      }
    }

    // Reset match state
    await resetVoting();
    matchActive = false;
    bettingOpen = false;
    
    // Reset admin buttons
    const openBtn = document.getElementById('open-bets') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-bets') as HTMLButtonElement;
    const startBtn = document.getElementById('start-match') as HTMLButtonElement;
    const endBtn = document.getElementById('end-match') as HTMLButtonElement;
    
    if (openBtn) openBtn.disabled = false;
    if (closeBtn) closeBtn.disabled = true;
    if (startBtn) startBtn.disabled = true;
    if (endBtn) endBtn.disabled = true;

    updateUI();
    updateLeaderboards();
    updateHistory();
    alert("Match ended! Bets resolved.");
  } catch (error: any) {
    alert('Error ending match: ' + error.message);
  }
}

// Make deleteUser available globally for the delete buttons
(window as any).deleteUser = async function(userId: string) {
  if (!currentProfile?.is_admin) return;
  
  const profile = await getUserProfile(userId);
  if (confirm(`Admin, confirm delete ${profile.username}?`)) {
    try {
      // Note: Deleting from user_profiles will cascade delete related data
      // But we need to delete the auth user as well (this requires service role)
      alert("User deletion requires additional permissions. Please contact system administrator.");
    } catch (error: any) {
      alert('Error deleting user: ' + error.message);
    }
  }
};