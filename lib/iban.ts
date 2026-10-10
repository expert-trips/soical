export function validSaudiIban(value:string){
 const iban=value.replace(/\s/g,'').toUpperCase();
 if(!/^SA\d{22}$/.test(iban))return false;
 const digits=(iban.slice(4)+iban.slice(0,4)).replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));
 let remainder=0;for(const digit of digits)remainder=(remainder*10+Number(digit))%97;
 return remainder===1;
}
