/**
 * seed-demo-data.mjs
 * Creates example users, builder profiles, DAs, lead matches, and prospects
 * for testing the full Roweo flow.
 *
 * Run: node scripts/seed-demo-data.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import ws from 'ws'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
)

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'cameron.drayton@hotmail.co.uk'
const ADMIN_PASSWORD = 'Roweo2026!'

const BUILDERS = [
  {
    email:    'tom@sydneyrenovations.com.au',
    password: 'Builder2026!',
    full_name: 'Tom Hartley',
    plan: 'professional',
    company_name: 'Sydney Renovations Co.',
    phone: '0412 345 678',
    website: 'https://sydneyrenovations.com.au',
    license_number: 'BLD-334912',
    brand_color: '#1E40AF',
    tagline: 'Quality renovations across Sydney\'s inner west',
    service_suburbs: ['Parramatta', 'Westmead', 'Merrylands', 'Granville', 'Pendle Hill', 'Wentworthville'],
    service_states: ['NSW'],
    project_types: ['renovation', 'extension', 'granny_flat'],
    min_value_aud: 50000,
    max_value_aud: 500000,
    letters_remaining: 10,
    letter_template_approved: true,
  },
  {
    email:    'sarah@northshorebuilders.com.au',
    password: 'Builder2026!',
    full_name: 'Sarah Chen',
    plan: 'growth',
    company_name: 'North Shore Builders Pty Ltd',
    phone: '0421 987 654',
    website: 'https://northshorebuilders.com.au',
    license_number: 'BLD-221087',
    brand_color: '#059669',
    tagline: 'Award-winning new homes on the North Shore',
    service_suburbs: ['Chatswood', 'Gordon', 'Wahroonga', 'Turramurra', 'St Ives', 'Pymble', 'Hornsby'],
    service_states: ['NSW'],
    project_types: ['new_dwelling', 'renovation', 'extension'],
    min_value_aud: 200000,
    max_value_aud: 2000000,
    letters_remaining: 20,
    letter_template_approved: true,
  },
  {
    email:    'mike@easternsuburbsbuild.com.au',
    password: 'Builder2026!',
    full_name: 'Mike Abramovic',
    plan: 'starter',
    company_name: 'Eastern Suburbs Build',
    phone: '0435 111 222',
    website: 'https://easternsuburbsbuild.com.au',
    license_number: 'BLD-445671',
    brand_color: '#7C3AED',
    tagline: 'Boutique builds in the Eastern Suburbs',
    service_suburbs: ['Bondi', 'Randwick', 'Coogee', 'Maroubra', 'Clovelly', 'Bronte'],
    service_states: ['NSW'],
    project_types: ['renovation', 'pool', 'extension'],
    min_value_aud: 80000,
    max_value_aud: 800000,
    letters_remaining: 0,
    letter_template_approved: false,
  },
]

const SAMPLE_DAS = [
  // Parramatta area (matches Tom)
  { suburb: 'Parramatta', postcode: '2150', state: 'NSW', council: 'City of Parramatta', description: 'Alterations and additions to existing dwelling including new first floor extension and internal renovation', project_type: 'extension', estimated_value_aud: 185000, street_address: '14 Church St', da_number: 'DA/2026/0442', lodged_date: '2026-06-28' },
  { suburb: 'Merrylands', postcode: '2160', state: 'NSW', council: 'Cumberland City Council', description: 'Construction of a granny flat to the rear of existing dwelling', project_type: 'granny_flat', estimated_value_aud: 95000, street_address: '32 Woodville Rd', da_number: 'DA/2026/0891', lodged_date: '2026-06-27' },
  { suburb: 'Wentworthville', postcode: '2145', state: 'NSW', council: 'Cumberland City Council', description: 'Renovation of existing kitchen and bathrooms plus new alfresco area', project_type: 'renovation', estimated_value_aud: 72000, street_address: '8 Great Western Hwy', da_number: 'DA/2026/0554', lodged_date: '2026-06-29' },
  { suburb: 'Granville', postcode: '2142', state: 'NSW', council: 'Cumberland City Council', description: 'Two storey dwelling addition including new master bedroom suite and living area extension', project_type: 'extension', estimated_value_aud: 210000, street_address: '55 Blaxcell St', da_number: 'DA/2026/0773', lodged_date: '2026-06-25' },
  { suburb: 'Pendle Hill', postcode: '2145', state: 'NSW', council: 'Cumberland City Council', description: 'Internal renovation including new kitchen, bathroom and laundry fitout', project_type: 'renovation', estimated_value_aud: 88000, street_address: '22 Pendle Way', da_number: 'DA/2026/0612', lodged_date: '2026-06-30' },

  // North Shore area (matches Sarah)
  { suburb: 'Chatswood', postcode: '2067', state: 'NSW', council: 'Willoughby City Council', description: 'Demolition of existing dwelling and construction of new two storey dwelling with basement garage', project_type: 'new_dwelling', estimated_value_aud: 1250000, street_address: '7 Archer St', da_number: 'DA/2026/0334', lodged_date: '2026-06-28' },
  { suburb: 'Gordon', postcode: '2072', state: 'NSW', council: 'Ku-ring-gai Council', description: 'First floor addition to existing single storey dwelling including new bedrooms and ensuite', project_type: 'extension', estimated_value_aud: 320000, street_address: '18 Pacific Hwy', da_number: 'DA/2026/0519', lodged_date: '2026-06-26' },
  { suburb: 'Wahroonga', postcode: '2076', state: 'NSW', council: 'Ku-ring-gai Council', description: 'New single storey dwelling on vacant land with double garage and landscaping', project_type: 'new_dwelling', estimated_value_aud: 850000, street_address: '43 Coonanbarra Rd', da_number: 'DA/2026/0287', lodged_date: '2026-06-27' },
  { suburb: 'St Ives', postcode: '2075', state: 'NSW', council: 'Ku-ring-gai Council', description: 'Major renovation including new kitchen, bathrooms and extension to rear living area', project_type: 'renovation', estimated_value_aud: 420000, street_address: '11 Killeaton St', da_number: 'DA/2026/0698', lodged_date: '2026-06-29' },

  // Eastern Suburbs (matches Mike)
  { suburb: 'Bondi', postcode: '2026', state: 'NSW', council: 'Waverley Council', description: 'Renovation of existing terrace including rear extension, new kitchen and bathroom', project_type: 'renovation', estimated_value_aud: 195000, street_address: '66 Curlewis St', da_number: 'DA/2026/0823', lodged_date: '2026-06-28' },
  { suburb: 'Coogee', postcode: '2034', state: 'NSW', council: 'Randwick City Council', description: 'Inground swimming pool and associated landscaping works', project_type: 'pool', estimated_value_aud: 68000, street_address: '29 Brook St', da_number: 'DA/2026/0445', lodged_date: '2026-06-25' },
  { suburb: 'Randwick', postcode: '2031', state: 'NSW', council: 'Randwick City Council', description: 'Ground floor extension to rear of dwelling, new deck and pergola', project_type: 'extension', estimated_value_aud: 145000, street_address: '84 Frenchman Rd', da_number: 'DA/2026/0901', lodged_date: '2026-06-30' },
  { suburb: 'Maroubra', postcode: '2035', state: 'NSW', council: 'Randwick City Council', description: 'Alterations and additions including new ground floor family room and alfresco terrace', project_type: 'extension', estimated_value_aud: 175000, street_address: '102 Malabar Rd', da_number: 'DA/2026/0376', lodged_date: '2026-06-27' },

  // Extra mixed DAs for admin panel
  { suburb: 'Blacktown', postcode: '2148', state: 'NSW', council: 'Blacktown City Council', description: 'Demolition of existing structures and construction of new dual occupancy development', project_type: 'new_dwelling', estimated_value_aud: 680000, street_address: '15 Kildare Rd', da_number: 'DA/2026/0102', lodged_date: '2026-06-24' },
  { suburb: 'Castle Hill', postcode: '2154', state: 'NSW', council: 'The Hills Shire Council', description: 'Construction of swimming pool, spa and associated pool house', project_type: 'pool', estimated_value_aud: 120000, street_address: '8 Old Northern Rd', da_number: 'DA/2026/0567', lodged_date: '2026-06-26' },
  { suburb: 'Hornsby', postcode: '2077', state: 'NSW', council: 'Hornsby Shire Council', description: 'New single storey dwelling with attached garage on newly subdivided lot', project_type: 'new_dwelling', estimated_value_aud: 550000, street_address: '3 Peats Ferry Rd', da_number: 'DA/2026/0388', lodged_date: '2026-06-28' },
  { suburb: 'Pymble', postcode: '2073', state: 'NSW', council: 'Ku-ring-gai Council', description: 'Demolition of existing garage and construction of detached secondary dwelling (granny flat)', project_type: 'granny_flat', estimated_value_aud: 105000, street_address: '44 Bobbin Head Rd', da_number: 'DA/2026/0654', lodged_date: '2026-06-29' },
  { suburb: 'Turramurra', postcode: '2074', state: 'NSW', council: 'Ku-ring-gai Council', description: 'Renovation and extension including new rear living room, kitchen and master bedroom wing', project_type: 'extension', estimated_value_aud: 380000, street_address: '91 Pacific Hwy', da_number: 'DA/2026/0211', lodged_date: '2026-06-27' },
  { suburb: 'Westmead', postcode: '2145', state: 'NSW', council: 'Cumberland City Council', description: 'Fit-out of existing garage as secondary dwelling with new bathroom, kitchenette and laundry', project_type: 'granny_flat', estimated_value_aud: 85000, street_address: '17 Darcy Rd', da_number: 'DA/2026/0733', lodged_date: '2026-06-30' },
  { suburb: 'Bronte', postcode: '2024', state: 'NSW', council: 'Waverley Council', description: 'Alterations and additions to existing semi-detached dwelling including new first floor bedroom and study', project_type: 'extension', estimated_value_aud: 155000, street_address: '13 Gardyne St', da_number: 'DA/2026/0488', lodged_date: '2026-06-26' },
]

const SAMPLE_PROSPECTS = [
  {
    company_name: 'Blue Mountains Building Co',
    website: 'https://bluemountainsbuild.com.au',
    email: 'hello@bluemountainsbuild.com.au',
    phone: '0247 828 900',
    postal_address: '12 Katoomba St, Katoomba NSW 2780',
    abn: '44 123 456 789',
    business_type: 'renovation',
    service_suburbs: ['Katoomba', 'Leura', 'Wentworth Falls'],
    fit_score: 82,
    fit_reasons: ['Residential renovation focus', 'Strong web presence', 'Verified postal address', 'Active email'],
    status: 'reviewed',
    ai_summary: 'Boutique renovation company specialising in heritage Blue Mountains properties. Strong online presence with portfolio. Good fit for high-value renovation leads.',
  },
  {
    company_name: 'Premier Extensions Sydney',
    website: 'https://premierextensions.com.au',
    email: 'info@premierextensions.com.au',
    phone: '0285 221 100',
    postal_address: '55 Parramatta Rd, Homebush NSW 2140',
    abn: '71 234 567 890',
    business_type: 'extension',
    service_suburbs: ['Homebush', 'Burwood', 'Strathfield', 'Concord', 'Rhodes'],
    fit_score: 91,
    fit_reasons: ['Extension specialist', 'Inner-west coverage', 'High DA volume suburb match', 'Postal address confirmed'],
    status: 'approved',
    ai_summary: 'Established extension company covering inner west Sydney. Excellent match with high-DA suburbs. Website shows recent completed projects with testimonials.',
    letter_body_text: `Dear Premier Extensions Sydney,\n\nWe noticed your excellent work on home extensions across Homebush and Burwood — exactly the areas where we're seeing strong development application activity right now.\n\nIn the past 30 days, there have been 14 new development applications lodged in your service area for extensions and additions. These represent homeowners who are actively planning projects and looking for a quality builder like you.\n\nWith Roweo, you'd be first to reach these homeowners with a personalised letter — before they've even started getting quotes. We handle the matching and printing; you focus on winning the work.\n\nScan the QR code on the enclosed card to see your personalised dashboard with live leads from your suburbs.\n\nKind regards,\nThe Roweo Team`,
  },
  {
    company_name: 'Beachside Renovations',
    website: 'https://beachsiderenovations.com.au',
    email: 'contact@beachsiderenovations.com.au',
    phone: '0293 450 110',
    postal_address: '4/22 Campbell Parade, Bondi Beach NSW 2026',
    abn: '55 345 678 901',
    business_type: 'renovation',
    service_suburbs: ['Bondi', 'Bondi Beach', 'North Bondi', 'Rose Bay', 'Dover Heights'],
    fit_score: 88,
    fit_reasons: ['Eastern Suburbs renovation focus', 'High property value area', 'Strong brand presence'],
    status: 'scraped',
    ai_summary: 'High-end renovation specialist in Eastern Suburbs. Focuses on premium terrace and apartment renovations in Bondi area.',
  },
  {
    company_name: 'Hills District Constructions',
    website: 'https://hillsdistrictconstructions.com.au',
    email: 'build@hillsdc.com.au',
    phone: '0298 762 345',
    postal_address: '8 Old Northern Rd, Baulkham Hills NSW 2153',
    abn: '62 456 789 012',
    business_type: 'new_dwelling',
    service_suburbs: ['Castle Hill', 'Baulkham Hills', 'Kellyville', 'Rouse Hill', 'Beaumont Hills'],
    fit_score: 76,
    fit_reasons: ['New dwelling specialist', 'Hills District coverage', 'Has postal address'],
    status: 'reviewed',
    ai_summary: 'Mid-to-large builder specialising in new homes in The Hills district. Good overlap with high-growth suburban DA activity.',
  },
  {
    company_name: 'North Shore Quality Homes',
    website: 'https://northshorequalityhomes.com.au',
    email: 'enquiries@nsqh.com.au',
    phone: '0299 112 800',
    postal_address: '211 Pacific Hwy, St Leonards NSW 2065',
    abn: '89 567 890 123',
    business_type: 'new_dwelling',
    service_suburbs: ['Chatswood', 'Lane Cove', 'Artarmon', 'St Leonards', 'Crows Nest'],
    fit_score: 85,
    fit_reasons: ['Premium North Shore focus', 'Verified email', 'High value project match'],
    status: 'approved',
    letter_body_text: `Dear North Shore Quality Homes,\n\nWith 22 new development applications lodged in Chatswood and surrounds this month alone, the North Shore market is as active as we've seen it.\n\nRoweo automatically matches you to these homeowners and posts personalised letters on your behalf — so you're in their letterbox before your competitors even know the DA was lodged.\n\nScan the QR code to see your live lead dashboard.`,
  },
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
async function upsertAuthUser(email, password, fullName, role = 'builder') {
  // Check if user exists
  const { data: existing } = await supabase.auth.admin.listUsers()
  const found = existing?.users?.find(u => u.email === email)

  if (found) {
    console.log(`  ✓ User exists: ${email} (${found.id})`)
    // Update password
    await supabase.auth.admin.updateUserById(found.id, { password })
    return found
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error) throw new Error(`Auth create failed for ${email}: ${error.message}`)
  console.log(`  ✓ Created auth user: ${email} (${data.user.id})`)
  return data.user
}

async function ensureProfile(userId, email, fullName, role, plan = 'inactive') {
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).single()
  if (existing) {
    await supabase.from('profiles').update({ role, plan, subscription_status: plan === 'inactive' ? 'inactive' : 'active', onboarding_completed: role === 'admin' || plan !== 'inactive', email, full_name: fullName }).eq('id', userId)
    console.log(`  ✓ Profile updated: ${email}`)
    return
  }
  const { error } = await supabase.from('profiles').insert({
    id: userId, email, full_name: fullName, role, plan,
    subscription_status: plan === 'inactive' ? 'inactive' : 'active',
    onboarding_completed: role === 'admin' || plan !== 'inactive',
  })
  if (error) throw new Error(`Profile insert failed: ${error.message}`)
  console.log(`  ✓ Profile created: ${email}`)
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Seeding Roweo demo data...\n')

  // ── 1. Admin user ──────────────────────────────────────────
  console.log('1. Admin user')
  const adminUser = await upsertAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'Cameron Drayton', 'admin')
  await ensureProfile(adminUser.id, ADMIN_EMAIL, 'Cameron Drayton', 'admin', 'growth')

  // ── 2. Feature flags ───────────────────────────────────────
  console.log('\n2. Feature flags')
  const flags = [
    { key: 'multi_stage_campaigns', enabled: false, description: 'Letters at lodgement + approval stage' },
    { key: 'postcard_letters', enabled: false, description: 'A5 postcard PDF option' },
    { key: 'team_permissions', enabled: false, description: 'Multi-user builder accounts' },
    { key: 'ai_auto_body_text', enabled: true, description: 'Auto-generate letter body via DeepSeek' },
    { key: 'roi_tracking', enabled: true, description: 'Builder outcome logging' },
  ]
  for (const f of flags) {
    const { error } = await supabase.from('feature_flags').upsert(f, { onConflict: 'key' })
    if (error) console.log(`  ⚠ Flag ${f.key}: ${error.message}`)
    else console.log(`  ✓ Flag: ${f.key}`)
  }

  // ── 3. Builder users + profiles ────────────────────────────
  console.log('\n3. Builder users')
  const builderIds = []
  for (const b of BUILDERS) {
    const user = await upsertAuthUser(b.email, b.password, b.full_name)
    await ensureProfile(user.id, b.email, b.full_name, 'builder', b.plan)

    // Builder profile
    const { data: existing } = await supabase.from('builder_profiles').select('id').eq('user_id', user.id).single()
    const profileData = {
      user_id: user.id,
      company_name: b.company_name,
      brand_color: b.brand_color,
      tagline: b.tagline,
      phone: b.phone,
      website: b.website,
      license_number: b.license_number,
      service_suburbs: b.service_suburbs,
      service_states: b.service_states,
      project_types: b.project_types,
      min_value_aud: b.min_value_aud,
      max_value_aud: b.max_value_aud || null,
      letters_remaining: b.letters_remaining,
      letter_template_approved: b.letter_template_approved,
      auto_send: b.letter_template_approved,
      letter_greeting: 'Dear Homeowner',
      letter_sign_off: 'Kind regards',
      letters_sent_count: Math.floor(Math.random() * 15),
      letters_scanned_count: Math.floor(Math.random() * 4),
    }

    let builderId
    if (existing) {
      await supabase.from('builder_profiles').update(profileData).eq('id', existing.id)
      builderId = existing.id
      console.log(`  ✓ Builder profile updated: ${b.company_name}`)
    } else {
      const { data, error } = await supabase.from('builder_profiles').insert(profileData).select('id').single()
      if (error) { console.log(`  ✗ Builder profile failed: ${error.message}`); continue }
      builderId = data.id
      console.log(`  ✓ Builder profile created: ${b.company_name}`)
    }
    builderIds.push({ userId: user.id, builderId, builder: b })
  }

  // ── 4. Development Applications ────────────────────────────
  console.log('\n4. Development Applications')
  const daIds = []
  for (const da of SAMPLE_DAS) {
    const { data, error } = await supabase.from('development_applications').upsert({
      source: 'seed_data',
      source_id: da.da_number,
      source_url: `https://www.planningportal.nsw.gov.au/find-a-development-application?id=${da.da_number}`,
      council: da.council,
      state: da.state,
      suburb: da.suburb,
      postcode: da.postcode,
      street_address: da.street_address,
      da_number: da.da_number,
      description: da.description,
      project_type: da.project_type,
      project_type_confidence: 0.92,
      estimated_value_aud: da.estimated_value_aud,
      lodged_date: da.lodged_date,
      status: 'new',
    }, { onConflict: 'source,source_id' }).select('id').single()

    if (error) { console.log(`  ✗ DA ${da.da_number}: ${error.message}`); continue }
    daIds.push({ id: data.id, suburb: da.suburb, project_type: da.project_type })
    console.log(`  ✓ DA: ${da.da_number} ${da.suburb}`)

    // Update suburb da_count
    await supabase.from('suburbs').upsert(
      { name: da.suburb, state: da.state, postcode: da.postcode, da_count: 1 },
      { onConflict: 'name,state', ignoreDuplicates: false }
    )
  }

  // ── 5. Lead Matches ────────────────────────────────────────
  console.log('\n5. Lead Matches')
  const statuses = ['new', 'viewed', 'saved', 'letter_approved', 'printed', 'posted', 'scanned']

  for (const { userId, builderId, builder } of builderIds) {
    for (const da of daIds) {
      // Only match if suburb is in builder's service_suburbs
      if (!builder.service_suburbs.includes(da.suburb)) continue
      // Only match if project type is in builder's project_types
      if (!builder.project_types.includes(da.project_type)) continue

      // Randomise status for demo variety
      const rand = Math.random()
      const status = rand < 0.15 ? 'new'
        : rand < 0.35 ? 'viewed'
        : rand < 0.50 ? 'saved'
        : rand < 0.65 ? 'letter_approved'
        : rand < 0.78 ? 'printed'
        : rand < 0.90 ? 'posted'
        : 'scanned'

      const now = new Date()
      const letterApprovedAt = ['letter_approved','printed','posted','scanned'].includes(status) ? new Date(now - 2*86400000).toISOString() : null
      const letterSentAt     = ['printed','posted','scanned'].includes(status) ? new Date(now - 1*86400000).toISOString() : null
      const scannedAt        = status === 'scanned' ? new Date(now - 3600000).toISOString() : null

      const { error } = await supabase.from('lead_matches').upsert({
        da_id: da.id,
        builder_id: builderId,
        user_id: userId,
        match_reasons: [`Suburb match: ${da.suburb}`, `Project type: ${da.project_type}`],
        status,
        letter_body_text: status !== 'new' ? `Dear Homeowner,\n\nI noticed a development application has been lodged for your property at ${da.suburb}. Our team at ${builder.company_name} would love to discuss your project and provide a competitive quote.\n\nWe specialise in ${builder.project_types.join(', ')} and have completed numerous successful projects in ${da.suburb} and the surrounding area.\n\nPlease give us a call or scan the QR code to learn more.\n\n${builder.letter_sign_off ?? 'Kind regards'},\n${builder.company_name}` : null,
        letter_generated_at: letterApprovedAt,
        letter_approved_at: letterApprovedAt,
        letter_sent_at: letterSentAt,
        batch_date: letterSentAt ? new Date(letterSentAt).toISOString().split('T')[0] : null,
        scanned_at: scannedAt,
        scan_count: scannedAt ? Math.floor(Math.random() * 3) + 1 : 0,
      }, { onConflict: 'da_id,builder_id,trigger_stage' })

      if (error) console.log(`  ✗ Match ${builderId}+${da.id}: ${error.message}`)
      else console.log(`  ✓ Match: ${builder.company_name} ← ${da.suburb} [${status}]`)
    }
  }

  // ── 6. Prospects ───────────────────────────────────────────
  console.log('\n6. Builder Prospects')
  for (const p of SAMPLE_PROSPECTS) {
    const { error } = await supabase.from('builder_prospects').upsert(p, { onConflict: 'company_name' }).select()
    if (error) {
      // If unique constraint on demo_slug fails, try insert with new slug
      const { error: e2 } = await supabase.from('builder_prospects').insert({
        ...p,
        demo_slug: `${p.company_name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}-${Date.now().toString(36)}`,
      })
      if (e2) console.log(`  ✗ Prospect ${p.company_name}: ${e2.message}`)
      else console.log(`  ✓ Prospect created: ${p.company_name}`)
    } else {
      console.log(`  ✓ Prospect upserted: ${p.company_name}`)
    }
  }

  // ── 7. Scraper run history (for admin health panel) ────────
  console.log('\n7. Scraper run history')
  const sources = ['council_da_api', 'nsw_eplanning', 'act_portal']
  for (const source of sources) {
    const startedAt = new Date(Date.now() - 2*3600000)
    const { error } = await supabase.from('scraper_runs').insert({
      source, started_at: startedAt.toISOString(),
      completed_at: new Date(startedAt.getTime() + 45000).toISOString(),
      das_scraped: Math.floor(Math.random() * 50) + 10,
      das_new: Math.floor(Math.random() * 15) + 2,
      matches_created: Math.floor(Math.random() * 8) + 1,
      status: 'done',
    })
    if (error) console.log(`  ✗ Scraper run ${source}: ${error.message}`)
    else console.log(`  ✓ Scraper run: ${source}`)
  }

  // ── 8. Subscription events (for analytics) ─────────────────
  console.log('\n8. Subscription events')
  for (const { userId, builder } of builderIds) {
    if (builder.plan === 'starter') continue
    const { error } = await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscribed',
      amount_aud: builder.plan === 'growth' ? 249 : 199,
      occurred_at: new Date(Date.now() - 7*86400000).toISOString(),
    })
    if (error && !error.message.includes('duplicate')) console.log(`  ✗ Sub event: ${error.message}`)
    else console.log(`  ✓ Sub event: ${builder.email}`)
  }

  console.log('\n✅ Seed complete!\n')
  console.log('Login credentials:')
  console.log(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  for (const b of BUILDERS) {
    console.log(`  Builder: ${b.email} / ${b.password} (${b.plan})`)
  }
}

seed().catch(e => { console.error('Seed failed:', e); process.exit(1) })
