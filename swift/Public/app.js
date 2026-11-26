const SUPABASE_URL = "https://vqmagozxbfqlvbnfjfbh.supabase.co";
const SUPABASE_KEY = "sb_publishable_4fNijCqRR-IC6IANtGZJdg__tvaq9Rl";
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
async function rows(table, query) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers });
  if (!response.ok) throw new Error(`Could not load ${table}`);
  return response.json();
}
function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2600);
}
let artists = [];
let selectedType = "all";
function renderArtists() {
  const search = ($("#artist-search")?.value || "").trim().toLowerCase();
  const filtered = artists.filter((artist) => {
    const type = String(artist.artist_type || "").toLowerCase();
    const matchesType = selectedType === "all" || type.includes(selectedType.toLowerCase());
    const matchesSearch = [artist.display_name, artist.username, artist.bio, ...(artist.genres || [])].join(" ").toLowerCase().includes(search);
    return matchesType && matchesSearch;
  });
  $("#artist-grid").innerHTML = filtered.length ? filtered.map((artist) => {
    const name = escapeHTML(artist.display_name || artist.username || "Artist");
    const username = escapeHTML(artist.username || "");
    const avatar = artist.avatar_url ? `<img src="${escapeHTML(artist.avatar_url)}" alt="">` : escapeHTML(name.slice(0,1).toUpperCase());
    return `<article class="artist-card"><div class="artist-avatar">${avatar}</div><div class="artist-name">${name}</div><div class="artist-handle">@${username}</div><span class="artist-type">${escapeHTML(artist.artist_type || "Artist")}</span></article>`;
  }).join("") : '<div class="loading-state">No artists found yet. Try another search.</div>';
}
async function loadArtists() {
  try {
    artists = await rows("artist_profiles", "select=id,username,display_name,artist_type,bio,genres,avatar_url&order=created_at.desc&limit=24");
    renderArtists();
  } catch (error) { $("#artist-grid").innerHTML = '<div class="loading-state">Artists are temporarily unavailable.</div>'; console.error(error); }
}
async function loadRequests() {
  try {
    const requests = await rows("song_requests", "select=id,author_id,title,description,genre,looking_for,created_at&order=created_at.desc&limit=9");
    const ids = [...new Set(requests.map((r) => r.author_id).filter(Boolean))];
    let authors = [];
    if (ids.length) authors = await rows("artist_profiles", `select=id,username,display_name&id=in.(${ids.join(",")})`);
    const byId = Object.fromEntries(authors.map((a) => [a.id,a]));
    $("#request-grid").innerHTML = requests.length ? requests.map((r) => {
      const author = byId[r.author_id];
      return `<article class="request-card"><h3>${escapeHTML(r.title || "Untitled idea")}</h3><p>${escapeHTML(r.description || "An artist is looking for a collaborator.")}</p><div class="request-meta">${escapeHTML(r.genre || "Any genre")} · Looking for ${escapeHTML(r.looking_for || "a collaborator")} · ${escapeHTML(author?.display_name || author?.username || "Community member")}</div></article>`;
    }).join("") : '<div class="loading-state">No open requests just yet.</div>';
  } catch (error) { $("#request-grid").innerHTML = '<div class="loading-state">Requests are temporarily unavailable.</div>'; console.error(error); }
}
async function loadReleases() {
  try {
    const releases = await rows("releases", "select=id,title,artist_id,release_type,artwork_url,created_at&order=created_at.desc&limit=8");
    const ids = [...new Set(releases.map((r) => r.artist_id).filter(Boolean))];
    let artistsForReleases = [];
    if (ids.length) artistsForReleases = await rows("artist_profiles", `select=id,username,display_name&id=in.(${ids.join(",")})`);
    const byId = Object.fromEntries(artistsForReleases.map((a) => [a.id,a]));
    $("#release-grid").innerHTML = releases.length ? releases.map((r) => {
      const artist = byId[r.artist_id];
      const cover = r.artwork_url ? `<img src="${escapeHTML(r.artwork_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px">` : "produla";
      return `<article class="release-card"><div class="release-cover">${cover}</div><h3>${escapeHTML(r.title || "Untitled release")}</h3><p>${escapeHTML(artist?.display_name || artist?.username || r.release_type || "Independent release")}</p></article>`;
    }).join("") : '<div class="loading-state">New releases will show up here.</div>';
  } catch (error) { $("#release-grid").innerHTML = '<div class="loading-state">Releases are temporarily unavailable.</div>'; console.error(error); }
}
$("#artist-search").addEventListener("input", renderArtists);
document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
  selectedType = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("selected", b === button));
  renderArtists();
}));
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item === link));
}));
$("#login-button").addEventListener("click", () => toast("Account sign-in is the next integration step."));
$("#signup-button").addEventListener("click", () => toast("Account creation is the next integration step."));
$("#search-toggle").addEventListener("click", () => { $("#artist-search").focus(); $("#artists").scrollIntoView({behavior:"smooth"}); });
loadArtists(); loadRequests(); loadReleases();
