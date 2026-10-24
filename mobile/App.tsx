import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Keyboard,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NativeAppBar, NativeBottomTabs, TabId } from './src/components';
import {
  ContactContext,
  ContactScreen,
  HomeScreen,
  ProjectsScreen,
  PropertiesScreen,
  ServicesScreen,
  ProjectDetailScreen,
  PropertyDetailScreen,
} from './src/screens';
import { PublicProject, PublicProperty } from './src/api';
import { hydratePublicCache } from './src/hooks';
import { colors } from './src/theme';

type DetailRoute =
  | { kind: 'property'; slug: string }
  | { kind: 'project'; slug: string }
  | null;

function parseIncomingUrl(rawUrl: string): DetailRoute {
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    let kind: 'property' | 'project' | null = null;
    let slug = url.searchParams.get('slug') || '';

    if (url.protocol === 'otitech:') {
      const routeKind = url.hostname || segments[0] || '';
      kind = routeKind === 'property' || routeKind === 'project' ? routeKind : null;
      if (!slug) slug = url.hostname ? segments[0] || '' : segments[1] || '';
    } else if (url.protocol === 'https:' && ['otitech.com', 'www.otitech.com'].includes(url.hostname.toLowerCase())) {
      if (url.pathname.toLowerCase().endsWith('/property-details.html')) kind = 'property';
      if (url.pathname.toLowerCase().endsWith('/project-details.html')) kind = 'project';
    }

    if (!kind || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return null;
    return { kind, slug };
  } catch {
    return null;
  }
}

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set<TabId>(['home']));
  const [detail, setDetail] = useState<DetailRoute>(null);
  const [contactContext, setContactContext] = useState<ContactContext>();

  useEffect(() => {
    let isCurrent = true;
    void hydratePublicCache().finally(() => {
      if (isCurrent) setAppReady(true);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleIncomingUrl = useCallback((url: string) => {
    const route = parseIncomingUrl(url);
    if (route) {
      setDetail(route);
      setContactContext(undefined);
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleIncomingUrl(url);
    }).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
    return () => subscription.remove();
  }, [handleIncomingUrl]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detail) {
        setDetail(null);
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [detail, tab]);

  const markTabVisited = (nextTab: TabId) => {
    setVisitedTabs((current) => {
      if (current.has(nextTab)) return current;
      const next = new Set(current);
      next.add(nextTab);
      return next;
    });
  };

  const navigateToTab = (nextTab: TabId) => {
    Keyboard.dismiss();
    markTabVisited(nextTab);
    setDetail(null);
    setContactContext(undefined);
    setTab(nextTab);
  };

  const openProperty = (slug: string) => {
    Keyboard.dismiss();
    setDetail({ kind: 'property', slug });
  };
  const openProject = (slug: string) => {
    Keyboard.dismiss();
    setDetail({ kind: 'project', slug });
  };

  const enquireAboutProperty = (property: PublicProperty) => {
    markTabVisited('contact');
    setContactContext({ propertyId: property.id, title: property.title, service: 'real_estate' });
    setDetail(null);
    setTab('contact');
  };

  const enquireAboutProject = (project: PublicProject) => {
    markTabVisited('contact');
    setContactContext({ projectId: project.id, title: project.title, service: 'project_support' });
    setDetail(null);
    setTab('contact');
  };

  const enquireAboutService = (title: string, service: ContactContext['service']) => {
    markTabVisited('contact');
    setContactContext({ title, service });
    setDetail(null);
    setTab('contact');
  };

  const tabIds: TabId[] = ['home', 'properties', 'projects', 'services', 'contact'];

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle={appReady ? 'dark-content' : 'light-content'} />
        <SafeAreaView style={[styles.appFrame, !appReady && styles.appFrameSplash]} edges={['top', 'bottom']}>
          {!appReady ? <LaunchSplash /> : (
            <>
              <NativeAppBar active={tab} onBack={() => setDetail(null)} onContact={() => navigateToTab('contact')} />
              <View style={styles.screen}>
                {tabIds.map((tabId) => {
                  if (!visitedTabs.has(tabId)) return null;
                  const visible = tab === tabId && !detail;
                  return (
                    <View
                      key={tabId}
                      style={[styles.tabScreen, !visible && styles.hiddenTabScreen]}
                      pointerEvents={visible ? 'auto' : 'none'}
                      accessibilityElementsHidden={!visible}
                      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
                    >
                      {tabId === 'properties' ? (
                        <PropertiesScreen onProperty={openProperty} />
                      ) : tabId === 'projects' ? (
                        <ProjectsScreen onProject={openProject} />
                      ) : tabId === 'services' ? (
                        <ServicesScreen onContact={enquireAboutService} onBrowseProperties={() => navigateToTab('properties')} />
                      ) : tabId === 'contact' ? (
                        <ContactScreen context={contactContext} />
                      ) : (
                        <HomeScreen onTab={navigateToTab} onProperty={openProperty} onProject={openProject} />
                      )}
                    </View>
                  );
                })}
                {detail ? (
                  <View style={styles.detailOverlay} accessibilityViewIsModal>
                    {detail.kind === 'property' ? (
                      <PropertyDetailScreen key={`property:${detail.slug}`} slug={detail.slug} onBack={() => setDetail(null)} onEnquire={enquireAboutProperty} />
                    ) : (
                      <ProjectDetailScreen key={`project:${detail.slug}`} slug={detail.slug} onBack={() => setDetail(null)} onEnquire={enquireAboutProject} />
                    )}
                  </View>
                ) : null}
              </View>
              {!detail ? <NativeBottomTabs active={tab} onChange={navigateToTab} /> : null}
            </>
          )}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

function LaunchSplash() {
  return (
    <View style={styles.launchSplash} accessibilityLabel="OTI-TECH is opening">
      <Image source={require('./assets/adaptive-icon.png')} style={styles.launchLogo} resizeMode="contain" />
      <Text accessibilityRole="header" style={styles.launchBrand}>OTI-TECH</Text>
      <Text style={styles.launchTagline}>PROPERTY  |  DESIGN  |  DELIVERY</Text>
      <View style={styles.launchLoading}>
        <ActivityIndicator color={colors.gold} />
        <Text style={styles.launchLoadingText}>Opening your saved experience</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deep },
  appFrame: { flex: 1, backgroundColor: colors.background },
  appFrameSplash: { backgroundColor: colors.deep },
  launchSplash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep, gap: 14 },
  launchLogo: { width: 140, height: 140 },
  launchBrand: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: 2.2 },
  launchTagline: { color: '#D8CEE7', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  launchLoading: { position: 'absolute', bottom: 48, alignItems: 'center', gap: 12 },
  launchLoadingText: { color: '#E6DFF0', fontSize: 12, fontWeight: '600' },
  screen: { flex: 1 },
  tabScreen: { flex: 1 },
  hiddenTabScreen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
  detailOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background, zIndex: 1, elevation: 1 },
});
