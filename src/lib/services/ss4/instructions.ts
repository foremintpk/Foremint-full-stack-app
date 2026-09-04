/**
 * The standing rules for turning a Foremint order into an SS-4. These are baked
 * in so a run needs no typing; the UI's instructions box is appended to them and
 * can override any line.
 *
 * They also form the system prompt when Claude reads a scanned Articles of
 * Organization, which is why the sourcing rules are spelled out so plainly.
 */
export const DEFAULT_INSTRUCTIONS = `
SS-4 preparation rules (Foremint):

LEGAL NAME (line 1)
- Use the entity name exactly as it appears on the filed Articles of
  Organization, not the name typed into the order form. Order-form names are
  frequently missing the "LLC" suffix.

FORMATION DATE (line 11)
- Take it from the state's filing stamp: "FILED: <date>" (WY), "Date Filed"
  (MT), "FILED <date> Sec. Of State" (FL), "Received and Filed" (KY), or
  "Effective" on a TX certificate.
- NEVER take the date from the file name. File names have been wrong before.

MAILING ADDRESS (lines 4a/4b)
- Use the address under the filing's mailing-address section: "The mailing
  address of the limited liability company is" (WY), "Business Mailing Address
  of Principal Office" (MT), "The mailing address of the Limited Liability
  Company is" (FL), "Article III: The mailing address of the entity's principal
  office is" (KY).
- Do not use the registered agent's address.
- Texas Certificates of Formation have NO mailing-address field. There, use the
  address under Article 3 "Governing Authority", printed beneath the managing
  member as "Address:". It is on the Certificate of Formation page, which comes
  after the cover certificate - keep reading past page 1.
  Take that address even though the registered agent sits at the same street:
  the entity's own suite number differs, and it is the only address the filing
  gives for the company.

COUNTY (line 6)
- Use the city of the mailing address, not the real county and not the state of
  formation: Kalispell / Austin / Sheridan / St. Petersburg.

RESPONSIBLE PARTY (line 7a)
- The member's name, spelled exactly as on their CNIC or passport. The Articles
  never name the client - every state form lists the organizer (the registered
  agent), so never take the name from there.

BUSINESS TYPE (lines 16 and 17)
- Both read exactly: Any legal Business

TRADE NAME (line 2)
- Always blank. The order form's "secondary business name" is a backup
  formation name, not a DBA.

ENTITY TYPE (lines 8b/9a)
- Single-member: line 8b = 1, line 9a = Other (specify) "Disregarded Entity".
- Multi-member: line 8b = the real member count, line 9a = Partnership.

ATTEMPT BANNER
- A resubmission carries an "Nth Attempt Please Give Attention" banner across
  the top. A first submission carries no banner.
`.trim();
