import { z } from 'zod';

/*
 * Camps de contingut teòric que admeten inline rich text (DATA-MODEL §3.6).
 * No validem la sintaxi aquí: qualsevol string és vàlid com a JSON; el parser
 * del renderer ignorarà tokens mal formats (p. ex. un `**` sense tanca).
 * Aquest alias existeix per fer explícit el contracte a la lectura del codi.
 */
export const RichStringSchema = z.string();
