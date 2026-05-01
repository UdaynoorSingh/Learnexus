
function emailHostMatchesDomainSuffix(emailHost, domainSuffix) {
  const host = String(emailHost || '').trim().toLowerCase();
  const suffix = String(domainSuffix || '').trim().toLowerCase();
  if (!host || !suffix) return false;
  if (host === suffix) return true;
  return host.endsWith(`.${suffix}`);
}

module.exports = { emailHostMatchesDomainSuffix };
