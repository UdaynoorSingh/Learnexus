/**
 * Return true if emailHost matches registered domain_suffix (exact or subdomain).
 * Both inputs should be trimmed lowercase ASCII hostnames (no @).
 */
function emailHostMatchesDomainSuffix(emailHost, domainSuffix) {
  const host = String(emailHost || '').trim().toLowerCase();
  const suffix = String(domainSuffix || '').trim().toLowerCase();
  if (!host || !suffix) return false;
  if (host === suffix) return true;
  return host.endsWith(`.${suffix}`);
}

module.exports = { emailHostMatchesDomainSuffix };
