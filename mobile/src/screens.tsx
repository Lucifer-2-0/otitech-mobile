import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { CachedImage } from './cached-image';
import {
  ApiEnvelope,
  CAN_SUBMIT_ENQUIRIES,
  EnquiryInput,
  PublicProject,
  PublicProperty,
  PublicSetting,
  apiPost,
  checkApiReadiness,
  formatPrice,
  queryPath,
  resolveImageUrl,
} from './api';
import { useApiResource, usePaginatedApiResource } from './hooks';
import { serviceOptions } from './serviceCatalog';
import {
  ActionButton,
  ApiState,
  FilterChip,
  Page,
  ProjectCard,
  PropertyCard,
  SectionHeading,
  StaleNotice,
  TabId,
} from './components';
import { colors, spacing } from './theme';

export type ContactContext = {
  propertyId?: number;
  projectId?: number;
  title?: string;
  service?: EnquiryInput['service'];
};

export function HomeScreen({
  onTab,
  onProperty,
  onProject,
}: {
  onTab: (tab: TabId) => void;
  onProperty: (slug: string) => void;
  onProject: (slug: string) => void;
}) {
  const properties = useApiResource<ApiEnvelope<PublicProperty[]>>('/properties?status=available&limit=6');
  const projects = useApiResource<ApiEnvelope<PublicProject[]>>('/projects?limit=6');
  const refresh = () => { properties.retry(); projects.retry(); };
  const refreshControl = <RefreshControl refreshing={properties.loading || projects.loading} onRefresh={refresh} tintColor={colors.primary} />;

  return (
    <Page refreshControl={refreshControl}>
      <View style={styles.dashboardWelcome}>
        <Text style={styles.screenEyebrow}>OTI-TECH | YOUR NEXT STEP</Text>
        <Text accessibilityRole="header" style={styles.dashboardTitle}>Find the right place for what is next.</Text>
        <Text style={styles.bodyText}>Browse homes, land, projects and practical support from the OTI-TECH team.</Text>
      </View>

      <Pressable onPress={() => onTab('properties')} accessibilityRole="button" accessibilityLabel="Search properties and locations" style={({ pressed }) => [styles.dashboardSearch, pressed && styles.pressed]}>
        <Text style={styles.dashboardSearchIcon}>{'\u2315'}</Text>
        <View style={styles.dashboardSearchCopy}>
          <Text style={styles.dashboardSearchTitle}>Search properties</Text>
          <Text style={styles.dashboardSearchSubtitle}>Location, price and property type</Text>
        </View>
        <Text style={styles.dashboardSearchArrow}>{'\u203a'}</Text>
      </Pressable>

      <View style={styles.shortcutGrid}>
        <HomeShortcut title="Properties" subtitle="Homes and land" symbol="\u2302" onPress={() => onTab('properties')} />
        <HomeShortcut title="Projects" subtitle="Work we have done" symbol="\u25c7" onPress={() => onTab('projects')} />
        <HomeShortcut title="Services" subtitle="Design and build" symbol="\u2692" onPress={() => onTab('services')} />
        <HomeShortcut title="Contact" subtitle="Talk to our team" symbol="\u2709" onPress={() => onTab('contact')} />
      </View>

      <StaleNotice visible={properties.isStale || projects.isStale} />
      <SectionHeading title="Available properties" action="See all" onAction={() => onTab('properties')} />
      <ApiState loading={properties.loading && !properties.data} error={properties.data ? null : properties.error} empty={properties.data?.data.length === 0 ? 'No available properties right now' : undefined} onRetry={properties.retry} />
      {properties.data?.data.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeRail}>
          {properties.data.data.map((property) => <PropertyCard key={property.id} item={property} horizontal onPress={() => onProperty(property.slug)} />)}
        </ScrollView>
      ) : null}

      <SectionHeading title="Recent projects" action="View portfolio" onAction={() => onTab('projects')} />
      <ApiState loading={projects.loading && !projects.data} error={projects.data ? null : projects.error} empty={projects.data?.data.length === 0 ? 'Project details are being updated' : undefined} onRetry={projects.retry} />
      {projects.data?.data.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeRail}>
          {projects.data.data.map((project) => <ProjectCard key={project.id} item={project} horizontal onPress={() => onProject(project.slug)} />)}
        </ScrollView>
      ) : null}

      <View style={styles.dashboardCallout}>
        <View style={styles.dashboardCalloutCopy}>
          <Text style={styles.dashboardCalloutTitle}>Need help planning?</Text>
          <Text style={styles.bodyText}>Tell us what you have in mind and our team will help you take the next step.</Text>
        </View>
        <ActionButton label="Talk to OTI-TECH" onPress={() => onTab('contact')} />
      </View>
    </Page>
  );
}

function HomeShortcut({ title, subtitle, symbol, onPress }: { title: string; subtitle: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} style={({ pressed }) => [styles.homeShortcut, pressed && styles.pressed]}>
      <View style={styles.homeShortcutIconWrap}><Text style={styles.homeShortcutIcon}>{symbol}</Text></View>
      <Text style={styles.homeShortcutTitle}>{title}</Text>
      <Text style={styles.homeShortcutSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export function LegacyHomeScreen({
  onTab,
  onProperty,
  onProject,
}: {
  onTab: (tab: TabId) => void;
  onProperty: (slug: string) => void;
  onProject: (slug: string) => void;
}) {
  const properties = useApiResource<ApiEnvelope<PublicProperty[]>>('/properties?status=available&limit=3');
  const projects = useApiResource<ApiEnvelope<PublicProject[]>>('/projects?limit=3');
  const refresh = () => { properties.retry(); projects.retry(); };
  const refreshControl = <RefreshControl refreshing={properties.loading || projects.loading} onRefresh={refresh} tintColor={colors.primary} />;

  return (
    <Page refreshControl={refreshControl}>
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <Text style={styles.heroKicker}>A CLEARER WAY FORWARD</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>Find a place. Build a future.</Text>
        <Text style={styles.heroBody}>Explore properties and projects, then connect with the OTI-TECH team when you’re ready.</Text>
        <View style={styles.heroActions}>
          <ActionButton label="Browse properties" onPress={() => onTab('properties')} />
          <ActionButton label="Our projects" onPress={() => onTab('projects')} secondary />
          <ActionButton label="Our services" onPress={() => onTab('services')} secondary />
        </View>
        <Text style={styles.heroFootnote}>PROPERTY · CONSTRUCTION · PROJECT SUPPORT</Text>
      </View>

      <View style={styles.quickLinks}>
        <QuickLink title="Find a property" subtitle="Search live listings" symbol="⌕" onPress={() => onTab('properties')} />
        <QuickLink title="Talk to our team" subtitle="Send an enquiry" symbol="↗" onPress={() => onTab('contact')} />
      </View>

      <StaleNotice visible={properties.isStale || projects.isStale} />
      <SectionHeading title="Available properties" action="View all" onAction={() => onTab('properties')} />
      <ApiState loading={properties.loading && !properties.data} error={properties.data ? null : properties.error} empty={properties.data?.data.length === 0 ? 'No available properties right now' : undefined} onRetry={properties.retry} />
      {properties.data ? properties.data.data.map((property) => (
        <PropertyCard key={property.id} item={property} onPress={() => onProperty(property.slug)} />
      )) : null}

      <SectionHeading title="Selected projects" action="See projects" onAction={() => onTab('projects')} />
      <ApiState loading={projects.loading && !projects.data} error={projects.data ? null : projects.error} empty={projects.data?.data.length === 0 ? 'Project details are being updated' : undefined} onRetry={projects.retry} />
      {projects.data ? projects.data.data.map((project) => (
        <ProjectCard key={project.id} item={project} onPress={() => onProject(project.slug)} />
      )) : null}

      <View style={styles.bottomCallout}>
        <Text style={styles.bottomCalloutTitle}>Planning your next move?</Text>
        <Text style={styles.bodyText}>Tell us what you’re looking for and our team will help you take the next step.</Text>
        <ActionButton label="Contact OTI-TECH" onPress={() => onTab('contact')} />
      </View>
    </Page>
  );
}

function QuickLink({ title, subtitle, symbol, onPress }: { title: string; subtitle: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}>
      <Text style={styles.quickLinkSymbol}>{symbol}</Text>
      <Text style={styles.quickLinkTitle}>{title}</Text>
      <Text style={styles.quickLinkSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export function PropertiesScreen({ onProperty }: { onProperty: (slug: string) => void }) {
  const [type, setType] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [priceError, setPriceError] = useState<string | null>(null);
  const path = useMemo(() => queryPath('/properties', {
    type: type === 'all' ? undefined : type,
    purpose: purpose === 'all' ? undefined : purpose,
    status: availableOnly ? 'available' : undefined,
    location: location.trim() || undefined,
    minPrice,
    maxPrice,
  }), [type, purpose, availableOnly, location, minPrice, maxPrice]);
  const resource = usePaginatedApiResource<PublicProperty>(path);

  const applySearch = () => {
    Keyboard.dismiss();
    const parsePrice = (raw: string, label: string): { value?: number; error?: string } => {
      const normalized = raw.trim().replace(/[\s,]/g, '');
      if (!normalized) return {};
      const value = Number(normalized);
      if (!Number.isFinite(value) || value <= 0) return { error: `${label} must be a number greater than zero.` };
      return { value };
    };
    const minimum = parsePrice(minPriceInput, 'Minimum price');
    const maximum = parsePrice(maxPriceInput, 'Maximum price');
    if (minimum.error || maximum.error) {
      setPriceError(minimum.error || maximum.error || null);
      return;
    }
    if (minimum.value !== undefined && maximum.value !== undefined && minimum.value > maximum.value) {
      setPriceError('Minimum price must be less than or equal to maximum price.');
      return;
    }
    setPriceError(null);
    setLocation(locationInput);
    setMinPrice(minimum.value);
    setMaxPrice(maximum.value);
  };
  const resetFilters = () => {
    Keyboard.dismiss();
    setType('all');
    setPurpose('all');
    setAvailableOnly(true);
    setLocationInput('');
    setLocation('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setPriceError(null);
  };

  return (
    <Page refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.retry} tintColor={colors.primary} />}>
      <ScreenIntro eyebrow="REAL ESTATE" title="Find your next place" body="Browse current listings and narrow the search to what matters to you." />
      <StaleNotice visible={resource.isStale} />
      <View style={styles.searchRow}>
        <TextInput
          value={locationInput}
          onChangeText={setLocationInput}
          onSubmitEditing={applySearch}
          placeholder="Search by location"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          accessibilityLabel="Search properties by location"
          style={styles.searchInput}
        />
        <Pressable onPress={applySearch} accessibilityRole="button" style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <Text style={styles.filterLabel}>PRICE RANGE · NGN</Text>
      <View style={styles.priceFields}>
        <TextInput
          value={minPriceInput}
          onChangeText={(value) => { setMinPriceInput(value); setPriceError(null); }}
          placeholder="Minimum"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          returnKeyType="done"
          accessibilityLabel="Minimum price in naira"
          style={styles.priceInput}
        />
        <TextInput
          value={maxPriceInput}
          onChangeText={(value) => { setMaxPriceInput(value); setPriceError(null); }}
          placeholder="Maximum"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          returnKeyType="done"
          accessibilityLabel="Maximum price in naira"
          style={styles.priceInput}
        />
      </View>
      {priceError ? <Text style={styles.formError} accessibilityRole="alert">{priceError}</Text> : null}

      <Text style={styles.filterLabel}>LISTING STATUS</Text>
      <View style={styles.chipRow}>
        <FilterChip label="Available" selected={availableOnly} onPress={() => setAvailableOnly(true)} />
        <FilterChip label="All statuses" selected={!availableOnly} onPress={() => setAvailableOnly(false)} />
      </View>

      <Text style={styles.filterLabel}>PURPOSE</Text>
      <View style={styles.chipRow}>
        {[['all', 'All'], ['sale', 'For sale'], ['rent', 'For rent']].map(([value, label]) => (
          <FilterChip key={value} label={label} selected={purpose === value} onPress={() => setPurpose(value)} />
        ))}
      </View>

      <Text style={styles.filterLabel}>PROPERTY TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {[
          ['all', 'All types'], ['house', 'House'], ['apartment', 'Apartment'], ['land', 'Land'], ['commercial', 'Commercial'],
        ].map(([value, label]) => (
          <FilterChip key={value} label={label} selected={type === value} onPress={() => setType(value)} />
        ))}
      </ScrollView>

      <SectionHeading title="Listings" action="Reset filters" onAction={resetFilters} />
      {resource.total > 0 ? <Text style={styles.resultCount}>{resource.total} matching properties</Text> : null}
      <ApiState loading={resource.loading && resource.items.length === 0} error={resource.items.length ? null : resource.error} empty={!resource.loading && resource.items.length === 0 ? 'No properties match these filters' : undefined} onRetry={resource.retry} />
      {resource.items.map((property) => (
        <PropertyCard key={property.id} item={property} onPress={() => onProperty(property.slug)} />
      ))}
      {resource.pageError ? <Text style={styles.formError} accessibilityRole="alert">{resource.pageError}</Text> : null}
      {resource.hasMore ? <ActionButton label="Load more properties" onPress={resource.loadMore} secondary loading={resource.loadingMore} /> : null}
    </Page>
  );
}

export function ProjectsScreen({ onProject }: { onProject: (slug: string) => void }) {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [year, setYear] = useState('');
  const path = useMemo(() => queryPath('/projects', {
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    location: location.trim() || undefined,
    year: year.trim() || undefined,
  }), [category, status, location, year]);
  const resource = usePaginatedApiResource<PublicProject>(path);
  const applyFilters = () => {
    Keyboard.dismiss();
    setLocation(locationInput);
    setYear(yearInput);
  };
  const resetFilters = () => {
    Keyboard.dismiss();
    setCategory('all');
    setStatus('all');
    setLocationInput('');
    setLocation('');
    setYearInput('');
    setYear('');
  };
  return (
    <Page refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.retry} tintColor={colors.primary} />}>
      <ScreenIntro eyebrow="OUR WORK" title="Projects with purpose" body="Explore OTI-TECH projects and the people, places, and planning behind them." />
      <StaleNotice visible={resource.isStale} />
      <View style={styles.searchRow}>
        <TextInput
          value={locationInput}
          onChangeText={setLocationInput}
          onSubmitEditing={applyFilters}
          placeholder="Search by location"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          accessibilityLabel="Search projects by location"
          style={styles.searchInput}
        />
      </View>
      <View style={styles.searchRow}>
        <TextInput
          value={yearInput}
          onChangeText={setYearInput}
          onSubmitEditing={applyFilters}
          placeholder="Year (e.g. 2024)"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="search"
          accessibilityLabel="Filter projects by year"
          style={styles.searchInput}
        />
        <Pressable onPress={applyFilters} accessibilityRole="button" accessibilityLabel="Apply project filters" style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Apply</Text>
        </Pressable>
      </View>
      <Text style={styles.filterLabel}>PROJECT STATUS</Text>
      <View style={styles.chipRow}>
        {[
          ['all', 'All'], ['planning', 'Planning'], ['ongoing', 'Ongoing'], ['completed', 'Completed'],
        ].map(([value, label]) => (
          <FilterChip key={value} label={label} selected={status === value} onPress={() => setStatus(value)} />
        ))}
      </View>
      <Text style={styles.filterLabel}>PROJECT TYPE</Text>
      <View style={styles.chipRow}>
        {[
          ['all', 'All types'], ['residential', 'Residential'], ['commercial', 'Commercial'], ['mixed_use', 'Mixed use'], ['renovation', 'Renovation'],
        ].map(([value, label]) => (
          <FilterChip key={value} label={label} selected={category === value} onPress={() => setCategory(value)} />
        ))}
      </View>
      <SectionHeading title="Projects" action="Reset filters" onAction={resetFilters} />
      {resource.total > 0 ? <Text style={styles.resultCount}>{resource.total} matching projects</Text> : null}
      <ApiState loading={resource.loading && resource.items.length === 0} error={resource.items.length ? null : resource.error} empty={!resource.loading && resource.items.length === 0 ? 'Project details are being updated' : undefined} onRetry={resource.retry} />
      {resource.items.map((project) => (
        <ProjectCard key={project.id} item={project} onPress={() => onProject(project.slug)} />
      ))}
      {resource.pageError ? <Text style={styles.formError} accessibilityRole="alert">{resource.pageError}</Text> : null}
      {resource.hasMore ? <ActionButton label="Load more projects" onPress={resource.loadMore} secondary loading={resource.loadingMore} /> : null}
    </Page>
  );
}

export function ServicesScreen({
  onContact,
  onBrowseProperties,
}: {
  onContact: (title: string, service: EnquiryInput['service']) => void;
  onBrowseProperties: () => void;
}) {
  return (
    <Page>
      <ScreenIntro eyebrow="OUR SERVICES" title="Practical solutions for every stage" body="From the first sketch to the finished property, OTI-TECH brings design, construction and real estate expertise under one roof." />
      <Text style={styles.serviceIntro}>Each discipline stands on its own, and they work best together. Talk with our team about the next step for your project.</Text>
      {serviceOptions.map((service) => (
        <View key={service.number} style={styles.serviceCard}>
          <View style={styles.serviceCardHeading}>
            <Text style={styles.serviceNumber}>{service.number}</Text>
            <Text accessibilityRole="header" style={styles.serviceTitle}>{service.title}</Text>
          </View>
          <Text style={styles.bodyText}>{service.description}</Text>
          <View style={styles.serviceFeatures}>
            {service.features.map((feature) => (
              <View key={feature} style={styles.serviceFeatureRow}>
                <Text style={styles.serviceBullet}>•</Text>
                <Text style={styles.serviceFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          {service.service === 'real_estate' ? (
            <>
              <ActionButton label="Browse properties" onPress={onBrowseProperties} />
              <ActionButton label={service.action} onPress={() => onContact(service.title, service.service)} secondary />
            </>
          ) : (
            <ActionButton label={service.action} onPress={() => onContact(service.title, service.service)} />
          )}
        </View>
      ))}
      <View style={styles.bottomCallout}>
        <Text style={styles.bottomCalloutTitle}>Have a project in mind?</Text>
        <Text style={styles.bodyText}>Tell us what you are planning and the OTI-TECH team will help you take the next step.</Text>
        <ActionButton label="Contact the team" onPress={() => onContact('Your project', 'project_support')} />
      </View>
    </Page>
  );
}

export function PropertyDetailScreen({ slug, onBack, onEnquire }: { slug: string; onBack: () => void; onEnquire: (item: PublicProperty) => void }) {
  const resource = useApiResource<ApiEnvelope<PublicProperty>>(`/properties/${encodeURIComponent(slug)}`);
  const property = resource.data?.data;
  return (
    <Page>
      <BackLink onPress={onBack} />
      <StaleNotice visible={resource.isStale} />
      <ApiState
        loading={resource.loading && !property}
        error={property ? null : resource.httpStatus === 404 ? 'This property is no longer available or could not be found. Go back to the listings or contact OTI-TECH about similar options.' : resource.error}
        onRetry={resource.httpStatus === 404 ? undefined : resource.retry}
      />
      {property ? (
        <>
          <ImageGallery images={property.images?.map((image) => ({ url: image.url, alt: image.altText || property.title })) || (property.image ? [{ url: property.image, alt: property.title }] : [])} />
          <Text style={styles.detailKicker}>{property.status.replace('_', ' ').toUpperCase()} · {property.purpose.toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.detailTitle}>{property.title}</Text>
          <Text style={styles.detailLocation}>⌖  {property.location}</Text>
          <Text style={styles.detailPrice}>{formatPrice(property.price, property.priceLabel)}</Text>
          <InfoPanel label="PROPERTY DETAILS">
            <DetailRow label="Type" value={property.type} />
            <DetailRow label="Purpose" value={property.purpose} />
            <DetailRow label="Status" value={property.status.replace('_', ' ')} />
            {property.size ? <DetailRow label="Size" value={property.size} /> : null}
          </InfoPanel>
          {property.description ? <InfoPanel label="ABOUT THIS PROPERTY"><Text style={styles.bodyText}>{property.description}</Text></InfoPanel> : null}
          {property.features?.length ? <InfoPanel label="FEATURES">{property.features.map((feature) => <Text key={feature} style={styles.featureText}>•  {feature}</Text>)}</InfoPanel> : null}
          <ActionButton label="Share property" onPress={() => Share.share({ message: `${property.title} — ${property.location}\nhttps://otitech.com/pages/property-details.html?slug=${encodeURIComponent(property.slug)}` })} secondary />
          <ActionButton label="Enquire about this property" onPress={() => onEnquire(property)} />
        </>
      ) : null}
    </Page>
  );
}

export function ProjectDetailScreen({ slug, onBack, onEnquire }: { slug: string; onBack: () => void; onEnquire: (item: PublicProject) => void }) {
  const resource = useApiResource<ApiEnvelope<PublicProject>>(`/projects/${encodeURIComponent(slug)}`);
  const project = resource.data?.data;
  return (
    <Page>
      <BackLink onPress={onBack} />
      <StaleNotice visible={resource.isStale} />
      <ApiState
        loading={resource.loading && !project}
        error={project ? null : resource.httpStatus === 404 ? 'This project could not be found. Return to the portfolio or contact OTI-TECH for more information.' : resource.error}
        onRetry={resource.httpStatus === 404 ? undefined : resource.retry}
      />
      {project ? (
        <>
          <ImageGallery images={project.images?.map((image) => ({ url: image.url, alt: image.altText || project.title })) || (project.image ? [{ url: project.image, alt: project.title }] : [])} />
          <Text style={styles.detailKicker}>{project.status.toUpperCase()} · {project.category.replace('_', ' ').toUpperCase()}</Text>
          <Text accessibilityRole="header" style={styles.detailTitle}>{project.title}</Text>
          <Text style={styles.detailLocation}>⌖  {project.location}{project.year ? ` · ${project.year}` : ''}</Text>
          <InfoPanel label="PROJECT DETAILS">
            <DetailRow label="Category" value={project.category.replace('_', ' ')} />
            <DetailRow label="Status" value={project.status} />
            {project.size ? <DetailRow label="Size" value={project.size} /> : null}
          </InfoPanel>
          {project.description ? <InfoPanel label="ABOUT THIS PROJECT"><Text style={styles.bodyText}>{project.description}</Text></InfoPanel> : null}
          {project.highlights?.length ? <InfoPanel label="HIGHLIGHTS">{project.highlights.map((highlight) => <Text key={highlight} style={styles.featureText}>•  {highlight}</Text>)}</InfoPanel> : null}
          <ActionButton label="Share project" onPress={() => Share.share({ message: `${project.title} — ${project.location}\nhttps://otitech.com/pages/project-details.html?slug=${encodeURIComponent(project.slug)}` })} secondary />
          <ActionButton label="Ask about this project" onPress={() => onEnquire(project)} />
        </>
      ) : null}
    </Page>
  );
}

export function ContactScreen({ context }: { context?: ContactContext }) {
  const settingsResource = useApiResource<ApiEnvelope<PublicSetting[]>>('/settings/public?keys=whatsapp_number&keys=company_phone&keys=company_email');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [service, setService] = useState<EnquiryInput['service']>('real_estate');
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<'ready' | 'error' | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setMessage(context?.title ? `I’m interested in ${context.title}.` : '');
    setService(context?.service || (context?.projectId ? 'project_support' : 'real_estate'));
    setSent(false);
    setSubmitError(null);
  }, [context?.title, context?.service, context?.propertyId, context?.projectId]);

  const publicSettings = useMemo(() => Object.fromEntries(
    (settingsResource.data?.data || []).map((setting) => [setting.key, setting.value]),
  ), [settingsResource.data]);

  const openLink = async (url: string) => {
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError('This contact option is not available on this device.');
    }
  };

  const checkConnection = async () => {
    setCheckingApi(true);
    setApiStatus(null);
    setApiStatusMessage(null);
    try {
      await checkApiReadiness();
      setApiStatus('ready');
      setApiStatusMessage('The configured OTI-TECH API is reachable.');
    } catch (error) {
      setApiStatus('error');
      setApiStatusMessage(error instanceof Error ? error.message : 'The service could not be reached. Check your connection and try again.');
    } finally {
      setCheckingApi(false);
    }
  };

  const submit = async () => {
    if (!CAN_SUBMIT_ENQUIRIES) {
      setSubmitError('The enquiry form is unavailable until this build has a suitable service connection.');
      return;
    }
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setSubmitError('Enter your name, phone number, and message to continue.');
      return;
    }
    setSending(true);
    setSubmitError(null);
    try {
      const enquiry: EnquiryInput = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        service,
        message: message.trim(),
        ...(context?.propertyId ? { propertyId: context.propertyId } : {}),
        ...(context?.projectId ? { projectId: context.projectId } : {}),
      };
      await apiPost<ApiEnvelope<unknown>>('/enquiries', enquiry);
      setSent(true);
      setName('');
      setPhone('');
      setEmail('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Your enquiry could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const whatsapp = publicSettings.whatsapp_number?.replace(/\D/g, '');
  const companyPhone = publicSettings.company_phone?.replace(/\s/g, '');
  const companyEmail = publicSettings.company_email;

  return (
    <Page>
      <ScreenIntro eyebrow="GET IN TOUCH" title="Let’s talk about your plans" body="Tell us what you need. The OTI-TECH team will follow up with you." />
      <StaleNotice visible={settingsResource.isStale} />
      <View style={styles.contactLinks}>
        {whatsapp ? <ActionButton label="Chat on WhatsApp" onPress={() => openLink(`https://wa.me/${whatsapp}`)} /> : null}
        {companyPhone ? <ActionButton label="Call OTI-TECH" onPress={() => openLink(`tel:${companyPhone}`)} secondary /> : null}
        {companyEmail ? <ActionButton label="Email the team" onPress={() => openLink(`mailto:${companyEmail}`)} secondary /> : null}
      </View>
      {linkError ? <Text style={styles.formError} accessibilityRole="alert">{linkError}</Text> : null}
      {settingsResource.error ? <Text style={styles.helperText}>Direct contact details are temporarily unavailable. You can still send the form below.</Text> : null}

      <InfoPanel label="SERVICE STATUS">
        <Text style={styles.helperText}>Check whether the configured OTI-TECH API is reachable from this device.</Text>
        <ActionButton label={apiStatus === 'ready' ? 'Check again' : 'Check connection'} onPress={checkConnection} secondary loading={checkingApi} />
        {apiStatusMessage ? <Text accessibilityLiveRegion="polite" style={apiStatus === 'ready' ? styles.statusSuccess : styles.formError}>{apiStatusMessage}</Text> : null}
      </InfoPanel>

      <InfoPanel label="SEND AN ENQUIRY">
        {context?.title ? <Text style={styles.contextNote}>About: {context.title}</Text> : null}
        {sent ? <View style={styles.successBox} accessibilityRole="alert"><Text style={styles.successTitle}>Enquiry sent</Text><Text style={styles.bodyText}>Thanks for contacting OTI-TECH. Your enquiry has been received.</Text></View> : null}
        <FormField label="Your name" value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" />
        <FormField label="Phone number" value={phone} onChangeText={setPhone} placeholder="e.g. +234 800 000 0000" keyboardType="phone-pad" />
        <FormField label="Email (optional)" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.inputLabel}>What can we help with?</Text>
        <View style={styles.chipRow}>
          {[
            ['real_estate', 'Real estate'], ['construction', 'Construction'], ['building_design', 'Building design'], ['project_support', 'Project support'],
          ].map(([value, label]) => (
            <FilterChip key={value} label={label} selected={service === value} onPress={() => setService(value as EnquiryInput['service'])} />
          ))}
        </View>
        <FormField label="Your message" value={message} onChangeText={setMessage} placeholder="Tell us a little about what you need" multiline />
        <Text style={styles.helperText}>Your contact details are sent to OTI-TECH so the team can respond to your enquiry.</Text>
        {!CAN_SUBMIT_ENQUIRIES ? <Text style={styles.helperText} accessibilityRole="alert">The enquiry form is unavailable until this build has a suitable service connection.</Text> : null}
        {submitError ? <Text style={styles.formError} accessibilityRole="alert">{submitError}</Text> : null}
        <ActionButton label="Send enquiry" onPress={submit} loading={sending} disabled={sending || !CAN_SUBMIT_ENQUIRIES} />
      </InfoPanel>
    </Page>
  );
}

function ScreenIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <View style={styles.screenIntro}>
      <Text style={styles.screenEyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.screenTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backLink}><Text style={styles.backLinkText}>‹  Back</Text></Pressable>;
}

function ImageGallery({ images }: { images: { url: string; alt: string }[] }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const validImages = images
    .map((image) => ({ ...image, uri: resolveImageUrl(image.url) }))
    .filter((image): image is { url: string; alt: string; uri: string } => Boolean(image.uri));
  if (!validImages.length) {
    return <View style={styles.detailImageFallback}><Text style={styles.imageFallbackMark}>O</Text><Text style={styles.imageFallbackText}>OTI-TECH</Text></View>;
  }
  const goToImage = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, validImages.length - 1));
    scrollRef.current?.scrollTo({ x: width * nextIndex, y: 0, animated: true });
    setActiveIndex(nextIndex);
  };
  return (
    <>
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.gallery}
      accessibilityLabel="Property and project photos"
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(Math.max(0, Math.min(index, validImages.length - 1)));
      }}
    >
      {validImages.map((image, index) => (
        <GallerySlide key={`${image.url}-${index}`} uri={image.uri} alt={image.alt} width={width} />
      ))}
    </ScrollView>
    {validImages.length > 1 ? (
      <View style={styles.galleryControls}>
        <Pressable
          onPress={() => goToImage(activeIndex - 1)}
          disabled={activeIndex === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous photo"
          accessibilityState={{ disabled: activeIndex === 0 }}
          style={({ pressed }) => [styles.galleryControl, activeIndex === 0 && styles.galleryControlDisabled, pressed && activeIndex > 0 && styles.pressed]}
        >
          <Text style={styles.galleryControlText}>Previous</Text>
        </Pressable>
        <Text style={styles.galleryPosition} accessibilityLiveRegion="polite">Photo {activeIndex + 1} of {validImages.length}</Text>
        <Pressable
          onPress={() => goToImage(activeIndex + 1)}
          disabled={activeIndex === validImages.length - 1}
          accessibilityRole="button"
          accessibilityLabel="Next photo"
          accessibilityState={{ disabled: activeIndex === validImages.length - 1 }}
          style={({ pressed }) => [styles.galleryControl, activeIndex === validImages.length - 1 && styles.galleryControlDisabled, pressed && activeIndex < validImages.length - 1 && styles.pressed]}
        >
          <Text style={styles.galleryControlText}>Next</Text>
        </Pressable>
      </View>
    ) : null}
    </>
  );
}

function GallerySlide({ uri, alt, width }: { uri: string; alt: string; width: number }) {
  const [failedUri, setFailedUri] = useState<string>();
  if (failedUri === uri) {
    return <View style={[styles.detailImageFallback, styles.detailImage, { width }]}><Text style={styles.imageFallbackMark}>O</Text><Text style={styles.imageFallbackText}>PHOTO UNAVAILABLE</Text></View>;
  }
  return <CachedImage uri={uri} accessibilityLabel={alt} style={[styles.detailImage, { width }]} resizeMode="cover" onError={() => setFailedUri(uri)} />;
}

function InfoPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.infoPanel}><Text style={styles.infoPanelLabel}>{label}</Text><View style={styles.infoPanelContent}>{children}</View></View>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailRowLabel}>{label}</Text><Text style={styles.detailRowValue}>{value}</Text></View>;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
        style={[styles.textInput, multiline && styles.textArea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardWelcome: { gap: spacing.sm, paddingTop: spacing.xs },
  dashboardTitle: { color: colors.deep, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  dashboardSearch: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  dashboardSearchIcon: { color: colors.primary, fontSize: 25, fontWeight: '700' },
  dashboardSearchCopy: { flex: 1, gap: 3 },
  dashboardSearchTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  dashboardSearchSubtitle: { color: colors.muted, fontSize: 11 },
  dashboardSearchArrow: { color: colors.primary, fontSize: 28, lineHeight: 32, marginTop: -3 },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  homeShortcut: { width: '48%', minHeight: 116, justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  homeShortcutIconWrap: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  homeShortcutIcon: { color: colors.primary, fontSize: 21, fontWeight: '700' },
  homeShortcutTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  homeShortcutSubtitle: { color: colors.muted, fontSize: 10 },
  homeRail: { gap: spacing.sm, paddingRight: spacing.md },
  dashboardCallout: { padding: spacing.lg, borderRadius: 20, backgroundColor: colors.lavender, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  dashboardCalloutCopy: { gap: spacing.xs },
  dashboardCalloutTitle: { color: colors.deep, fontSize: 20, lineHeight: 26, fontWeight: '900' },
  hero: { minHeight: 310, overflow: 'hidden', borderRadius: 26, backgroundColor: colors.deep, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  heroAccent: { width: 54, height: 4, borderRadius: 3, backgroundColor: colors.gold },
  heroKicker: { color: '#E7DDF6', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: colors.white, fontSize: 31, lineHeight: 37, fontWeight: '900', maxWidth: 340 },
  heroBody: { color: '#E8E2F1', fontSize: 14, lineHeight: 22, maxWidth: 330 },
  heroActions: { gap: spacing.sm, marginTop: spacing.xs },
  heroFootnote: { color: '#D4C9E2', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: spacing.xs },
  quickLinks: { flexDirection: 'row', gap: spacing.sm },
  quickLink: { flex: 1, minHeight: 128, padding: spacing.md, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', gap: 5 },
  quickLinkSymbol: { color: colors.primary, fontSize: 23, fontWeight: '700', marginBottom: 3 },
  quickLinkTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  quickLinkSubtitle: { color: colors.muted, fontSize: 11 },
  bottomCallout: { borderRadius: 20, backgroundColor: colors.lavender, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  bottomCalloutTitle: { color: colors.deep, fontSize: 20, fontWeight: '900' },
  bodyText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  serviceIntro: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  serviceCard: { padding: spacing.md, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, gap: spacing.md },
  serviceCardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  serviceNumber: { color: colors.gold, fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  serviceTitle: { flex: 1, color: colors.deep, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  serviceFeatures: { gap: spacing.xs },
  serviceFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  serviceBullet: { color: colors.primary, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  serviceFeatureText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 20 },
  screenIntro: { gap: spacing.sm, paddingTop: spacing.xs },
  screenEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  screenTitle: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '900' },
  searchRow: { flexDirection: 'row', gap: spacing.xs },
  searchInput: { flex: 1, minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 14 },
  priceFields: { flexDirection: 'row', gap: spacing.sm },
  priceInput: { flex: 1, minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 14 },
  searchButton: { minWidth: 78, minHeight: 48, paddingHorizontal: spacing.sm, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  filterLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: -8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  resultCount: { color: colors.muted, fontSize: 12, marginTop: -spacing.sm },
  pressed: { opacity: 0.82 },
  detailKicker: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  detailTitle: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  detailLocation: { color: colors.muted, fontSize: 14 },
  detailPrice: { color: colors.deep, fontSize: 22, fontWeight: '900' },
  gallery: { marginHorizontal: -spacing.md },
  galleryControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  galleryControl: { minWidth: 82, minHeight: 48, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white },
  galleryControlDisabled: { opacity: 0.45 },
  galleryControlText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  galleryPosition: { flex: 1, color: colors.muted, fontSize: 12, textAlign: 'center' },
  detailImage: { width: 360, height: 250, backgroundColor: colors.lavender },
  detailImageFallback: { height: 220, borderRadius: 20, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imageFallbackMark: { color: colors.gold, fontSize: 36, fontWeight: '800' },
  imageFallbackText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  backLink: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingRight: spacing.md },
  backLinkText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  infoPanel: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 18 },
  infoPanelLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  infoPanelContent: { gap: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 3 },
  detailRowLabel: { color: colors.muted, fontSize: 13, textTransform: 'capitalize' },
  detailRowValue: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right', textTransform: 'capitalize' },
  featureText: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  contactLinks: { gap: spacing.sm },
  formField: { gap: 7 },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  textInput: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, color: colors.ink, fontSize: 14 },
  textArea: { minHeight: 115, paddingTop: spacing.md },
  helperText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  statusSuccess: { color: colors.success, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  formError: { color: colors.danger, backgroundColor: '#FFF4F4', borderRadius: 10, padding: spacing.sm, fontSize: 12, lineHeight: 18 },
  successBox: { backgroundColor: '#F0F8F3', borderRadius: 12, padding: spacing.md, gap: 5 },
  successTitle: { color: colors.success, fontSize: 15, fontWeight: '900' },
  contextNote: { color: colors.deep, fontSize: 13, fontWeight: '700' },
});
