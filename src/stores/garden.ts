// ============================================================
// 花园状态管理
// ============================================================
import { reactive } from 'vue'
import { gardenApi, type GardenData } from '../api/garden'
import { starlightApi, type StarlightState } from '../api/starlight'
import { decorationApi, type Decoration } from '../api/decorations'

interface GardenState {
  data: GardenData | null
  starlight: StarlightState | null
  decorations: Decoration[]
  loading: boolean
  error: string | null
}

export const gardenStore = reactive<GardenState>({
  data: null,
  starlight: null,
  decorations: [],
  loading: false,
  error: null,
})

export async function fetchGarden() {
  gardenStore.loading = true
  gardenStore.error = null
  try {
    const [gardenData, slData, decoData] = await Promise.all([
      gardenApi.get(),
      starlightApi.get(),
      decorationApi.getAll(),
    ])
    gardenStore.data = gardenData
    gardenStore.starlight = slData
    gardenStore.decorations = decoData.decorations || []
  } catch (e: any) {
    gardenStore.error = e.message || '加载花园失败'
  } finally {
    gardenStore.loading = false
  }
}

export async function saveLayout(layoutData: Record<string, any>) {
  try {
    await gardenApi.saveLayout(layoutData)
  } catch (e: any) {
    console.error('Failed to save layout:', e)
  }
}

export async function unlockDecoration(id: string): Promise<boolean> {
  try {
    await decorationApi.unlock(id)
    await fetchGarden()
    return true
  } catch (e: any) {
    return false
  }
}

export async function equipDecoration(id: string): Promise<boolean> {
  try {
    await decorationApi.equip(id)
    await fetchGarden()
    return true
  } catch (e: any) {
    return false
  }
}

export async function unequipDecoration(id: string): Promise<boolean> {
  try {
    await decorationApi.unequip(id)
    await fetchGarden()
    return true
  } catch (e: any) {
    return false
  }
}
