/** Presentation only: never grants global roles or authorizes an API operation. */
export function catalogHeaderRole(globalRoles:readonly string[],capabilities:readonly string[]) {
    return globalRoles.some(role=>role==='ADMIN'||role==='ROLE_ADMIN')||capabilities.includes('catalog.grant.manage')?'Administrátor':'Kurátor';
}
