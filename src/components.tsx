import React, { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PublicProject, PublicProperty, formatPrice, resolveImageUrl } from './api';
import { colors, spacing } from './theme';

export type TabId = 'home' | 'properties' | 'projects' | 'services' | 'contact';

export function Page({ children, refreshControl }: { children: ReactNode; refreshControl?: React.ReactElement }) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>O</Text></View>
      <View style={styles.brandCopy}>
        <Text style={styles.brandName}>OTI-TECH</Text>
        <Text style={styles.brandTagline}>PROPERTY · CONSTRUCTION · PROJECTS</Text>
      </View>
    </View>
  );
}

export function BottomTabs({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string; symbol: string }[] = [
    { id: 'home', label: 'Home', symbol: '⌂' },
    { id: 'properties', label: 'Properties', symbol: '▦' },
    { id: 'projects', label: 'Projects', symbol: '▤' },
    { id: 'services', label: 'Services', symbol: '✦' },
    { id: 'contact', label: 'Contact', symbol: '✉' },
  ];

  return (
    <View style={styles.bottomTabs} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={styles.tabButton}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.tabSymbol, selected && styles.tabSelected]}>{tab.symbol}</Text>
            <Text style={[styles.tabLabel, selected && styles.tabSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.textActionButton}>
          <Text style={styles.textAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.actionButtonSecondary,
        (disabled || loading) && styles.actionButtonDisabled,
        pressed && !disabled && !loading && styles.actionButtonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.primary : colors.white} /> : (
        <Text style={[styles.actionButtonText, secondary && styles.actionButtonTextSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ApiState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty?: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return <View style={styles.apiState} accessibilityLiveRegion="polite"><ActivityIndicator color={colors.primary} /><Text style={styles.apiStateText}>Loading live information…</Text></View>;
  }
  if (error) {
    return (
      <View style={[styles.apiState, styles.apiStateError]} accessibilityRole="alert">
        <Text style={styles.apiStateTitle}>We couldn’t load this right now</Text>
        <Text style={styles.apiStateText}>{error}</Text>
        {onRetry ? <Pressable onPress={onRetry} accessibilityRole="button" style={styles.textActionButton}><Text style={styles.textAction}>Try again</Text></Pressable> : null}
      </View>
    );
  }
  if (empty) {
    return <View style={styles.apiState} accessibilityLiveRegion="polite"><Text style={styles.apiStateTitle}>{empty}</Text><Text style={styles.apiStateText}>Please check back soon or contact our team.</Text></View>;
  }
  return null;
}

export function StaleNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.staleNotice} accessibilityRole="alert">
      <Text style={styles.staleNoticeText}>Showing the last loaded information. Property availability, project details, or contact details may have changed; please confirm with OTI-TECH.</Text>
    </View>
  );
}

export function PropertyCard({ item, onPress }: { item: PublicProperty; onPress: () => void }) {
  const imageUri = resolveImageUrl(item.image || item.images?.[0]?.url);
  const [failedImageUri, setFailedImageUri] = useState<string>();
  const statusLabel = item.status.replace('_', ' ');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View property: ${item.title}. ${item.purpose} ${item.type}. ${statusLabel}. ${item.location}. ${formatPrice(item.price, item.priceLabel)}`} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardImageWrap}>
        {imageUri && failedImageUri !== imageUri ? <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" onError={() => setFailedImageUri(imageUri)} /> : (
          <View style={styles.imageFallback}><Text style={styles.imageFallbackMark}>O</Text><Text style={styles.imageFallbackText}>OTI-TECH</Text></View>
        )}
        <View style={styles.statusTag}><Text style={styles.statusTagText}>{statusLabel}</Text></View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardKicker}>{item.purpose.toUpperCase()} · {item.type.toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardLocation} numberOfLines={1}>⌖  {item.location}</Text>
        <Text style={styles.cardPrice}>{formatPrice(item.price, item.priceLabel)}</Text>
      </View>
    </Pressable>
  );
}

export function ProjectCard({ item, onPress }: { item: PublicProject; onPress: () => void }) {
  const imageUri = resolveImageUrl(item.image || item.images?.[0]?.url);
  const [failedImageUri, setFailedImageUri] = useState<string>();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View project: ${item.title}. ${item.status.replace('_', ' ')}. ${item.year || item.category.replace('_', ' ')}. ${item.location}`} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.projectImageWrap}>
        {imageUri && failedImageUri !== imageUri ? <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" onError={() => setFailedImageUri(imageUri)} /> : (
          <View style={styles.imageFallback}><Text style={styles.imageFallbackMark}>O</Text><Text style={styles.imageFallbackText}>OTI-TECH PROJECT</Text></View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardKicker}>{item.status.toUpperCase()} · {item.year || item.category.replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardLocation} numberOfLines={1}>⌖  {item.location}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  brandHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  brandMark: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.white, fontSize: 21, fontWeight: '800' },
  brandCopy: { gap: 2 },
  brandName: { color: colors.deep, fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
  brandTagline: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.9 },
  bottomTabs: { minHeight: 66, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 4, paddingBottom: 4 },
  tabButton: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabSymbol: { fontSize: 19, color: colors.muted, fontWeight: '700' },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  tabSelected: { color: colors.primary, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', flex: 1 },
  textActionButton: { minWidth: 48, minHeight: 48, justifyContent: 'center' },
  textAction: { color: colors.primary, fontWeight: '800', fontSize: 13, paddingVertical: 6 },
  actionButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionButtonSecondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  actionButtonDisabled: { opacity: 0.55 },
  actionButtonPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  actionButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  actionButtonTextSecondary: { color: colors.primary },
  filterChip: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: 'center' },
  filterChipSelected: { borderColor: colors.primary, backgroundColor: colors.lavender },
  filterChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  filterChipTextSelected: { color: colors.primary },
  apiState: { minHeight: 100, borderRadius: 16, padding: spacing.lg, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  apiStateError: { borderWidth: 1, borderColor: '#E9D7D8', backgroundColor: '#FFF9F9' },
  apiStateTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  apiStateText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  staleNotice: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 12, backgroundColor: '#FFF7E5', borderWidth: 1, borderColor: '#EBDDAD' },
  staleNoticeText: { color: '#614B18', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', marginBottom: spacing.md },
  cardPressed: { opacity: 0.88 },
  cardImageWrap: { height: 176, backgroundColor: colors.lavender },
  projectImageWrap: { height: 154, backgroundColor: colors.lavender },
  cardImage: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center', gap: 6 },
  imageFallbackMark: { color: colors.gold, fontSize: 36, fontWeight: '800' },
  imageFallbackText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  statusTag: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.white },
  statusTagText: { color: colors.deep, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  cardBody: { padding: spacing.md, gap: 7 },
  cardKicker: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.75 },
  cardTitle: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  cardLocation: { color: colors.muted, fontSize: 12 },
  cardPrice: { color: colors.deep, fontSize: 15, fontWeight: '900', marginTop: 2 },
});
